import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { PaymentRequestSchema, TPaymentRequest } from '@/lib/validators/payment';
import { ZodError } from 'zod';
import { Zarinpal } from 'zarinpal-checkout'; // یا هر نامی که کتابخانه دارد

// Initialize Zarinpal
// این مقدار باید از متغیرهای محیطی خوانده شود
const ZARINPAL_MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || 'YOUR_DEFAULT_MERCHANT_ID_IF_NOT_SET';
// حالت سندباکس (برای تست) - اگر کتابخانه از آن پشتیبانی می کند
const ZARINPAL_SANDBOX = process.env.ZARINPAL_SANDBOX_MODE === 'true'; // true or false

// نمونه سازی زرین پال - ممکن است نیاز به تنظیمات بیشتری داشته باشد
// این بستگی به کتابخانه zarinpal-checkout دارد.
// برخی کتابخانه ها ممکن است نیاز به new Zarinpal(...) داشته باشند.
// برخی دیگر ممکن است توابع مستقیم export کنند.
// فرض می کنیم کتابخانه یک کلاس Zarinpal دارد.
let zarinpalInstance: Zarinpal;
try {
    zarinpalInstance = new Zarinpal(ZARINPAL_MERCHANT_ID, ZARINPAL_SANDBOX);
} catch (e) {
    console.error("Failed to initialize Zarinpal instance:", e);
    // ممکن است بخواهید در صورت عدم موفقیت در نمونه سازی، خطای عمومی برگردانید
}


export async function POST(request: NextRequest) {
  if (!zarinpalInstance) {
    console.error("Zarinpal instance is not available.");
    return NextResponse.json({ message: 'سرویس پرداخت در حال حاضر در دسترس نیست. لطفاً بعداً تلاش کنید.' }, { status: 503 }); // Service Unavailable
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  let validatedRequestBody: TPaymentRequest;
  try {
    const body = await request.json();
    validatedRequestBody = PaymentRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'شناسه سفارش ارسال شده نامعتبر است.', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  const { orderId } = validatedRequestBody;

  try {
    // 1. Fetch order details and verify ownership and status
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, final_bid_amount, status, assigned_chef_id')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ message: 'سفارش مورد نظر یافت نشد.' }, { status: 404 });
    }

    if (orderData.user_id !== userProfile.id) {
      return NextResponse.json({ message: 'شما اجازه پرداخت برای این سفارش را ندارید.' }, { status: 403 });
    }

    // Check if order is in a payable state (e.g., 'chef_selected' or 'awaiting_payment')
    // This depends on your order workflow.
    if (orderData.status !== 'chef_selected' && orderData.status !== 'awaiting_payment') {
        // Add a specific status like 'awaiting_payment' to your order statuses
        // For now, assuming 'chef_selected' is the state before payment.
      return NextResponse.json({ message: `سفارش در وضعیت مناسب برای پرداخت نیست (وضعیت فعلی: ${orderData.status}).` }, { status: 403 });
    }

    if (!orderData.final_bid_amount || orderData.final_bid_amount <= 0) {
        return NextResponse.json({ message: 'مبلغ نهایی سفارش مشخص نشده یا نامعتبر است.' }, { status: 400 });
    }

    const amountToPay = Math.round(orderData.final_bid_amount); // زرین پال معمولا با ریال و عدد صحیح کار می کند
    const description = `پرداخت هزینه سفارش شماره ${orderId.substring(0,8)} در HomeFeast`;

    // Callback URL باید با آنچه در پنل زرین پال تنظیم کرده اید یکی باشد
    // و باید شامل دامنه کامل برنامه شما باشد.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const callbackUrl = `${siteUrl}/api/payment/verify`;

    // 2. Request payment from Zarinpal
    // متدهای کتابخانه zarinpal-checkout ممکن است متفاوت باشند. این یک نمونه است.
    const paymentResponse = await zarinpalInstance.PaymentRequest({
      Amount: amountToPay, // به ریال
      CallbackURL: callbackUrl,
      Description: description,
      Email: userProfile.email || undefined, // اختیاری
      // Mobile: userProfile.phone_number || undefined, // اختیاری
    });


    if (!paymentResponse || paymentResponse.status !== 100 || !paymentResponse.authority) {
      console.error('Zarinpal PaymentRequest failed:', paymentResponse);
      // اگر کد وضعیت خاصی برای خطاهای زرین پال دارید، اینجا مدیریت کنید
      return NextResponse.json({ message: 'خطا در ارتباط با درگاه پرداخت. لطفاً دوباره تلاش کنید.', errorDetails: paymentResponse?.message || 'Unknown Zarinpal error' }, { status: 502 }); // Bad Gateway
    }

    const authority = paymentResponse.authority;
    const paymentUrl = paymentResponse.url; // URL برای هدایت کاربر به درگاه

    // 3. Create a transaction record in your database
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        order_id: orderId,
        user_id: userProfile.id,
        amount: orderData.final_bid_amount, // مبلغ اصلی با اعشار (اگر در جدول اینطور ذخیره می کنید)
        authority: authority,
        status: 'initiated',
        payment_gateway: 'zarinpal',
        description: description,
        gateway_response: { request: paymentResponse } // ذخیره پاسخ اولیه زرین پال
      })
      .select('id')
      .single();

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      // این یک خطای داخلی است. کاربر نباید مستقیما درگیر آن شود.
      // ممکن است بخواهید به کاربر پیام دهید که بعدا تلاش کند یا با پشتیبانی تماس بگیرد.
      return NextResponse.json({ message: 'خطای داخلی در ثبت اطلاعات پرداخت. لطفاً با پشتیبانی تماس بگیرید.' }, { status: 500 });
    }

    // 4. Return the payment URL to the client
    return NextResponse.json({
        message: 'درخواست پرداخت با موفقیت ایجاد شد. در حال هدایت به درگاه پرداخت...',
        paymentUrl: paymentUrl,
        authority: authority, // ارسال authority برای پیگیری در کلاینت (اختیاری)
        transactionId: transactionData?.id // شناسه تراکنش داخلی شما
    }, { status: 200 });

  } catch (error) {
    console.error('Payment Request API - Generic error:', error);
    // برای خطاهای عمومی، پیام دوستانه تری به کاربر نشان دهید
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: `خطا در پردازش درخواست پرداخت: ${errorMessage}` }, { status: 500 });
  }
}
