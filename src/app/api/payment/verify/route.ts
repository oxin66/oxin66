import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ZarinpalVerifyQuerySchema, TZarinpalVerifyQuery } from '@/lib/validators/payment';
import { ZodError } from 'zod';
import { Zarinpal } from 'zarinpal-checkout'; // همان کتابخانه قبلی

// Initialize Zarinpal (مشابه request route)
const ZARINPAL_MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || 'YOUR_DEFAULT_MERCHANT_ID_IF_NOT_SET';
const ZARINPAL_SANDBOX = process.env.ZARINPAL_SANDBOX_MODE === 'true';

let zarinpalInstance: Zarinpal;
try {
    zarinpalInstance = new Zarinpal(ZARINPAL_MERCHANT_ID, ZARINPAL_SANDBOX);
} catch (e) {
    console.error("Failed to initialize Zarinpal instance for verify:", e);
}

// این URL ها باید در متغیرهای محیطی یا تنظیمات برنامه تعریف شوند
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const PAYMENT_SUCCESS_URL = `${SITE_URL}/payment/success`; // صفحه موفقیت پرداخت
const PAYMENT_FAILED_URL = `${SITE_URL}/payment/failed`;   // صفحه ناموفقیت پرداخت
const PAYMENT_CANCELLED_URL = `${SITE_URL}/payment/cancelled`; // صفحه لغو پرداخت

export async function GET(request: NextRequest) {
  if (!zarinpalInstance) {
    console.error("Zarinpal instance is not available for verify.");
    // هدایت به یک صفحه خطای عمومی یا نمایش پیام خطا
    return NextResponse.redirect(`${PAYMENT_FAILED_URL}?error=payment_service_unavailable`);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('Status');
  const authority = searchParams.get('Authority');

  // اعتبارسنجی پارامترهای دریافتی (اختیاری اما خوب)
  try {
    ZarinpalVerifyQuerySchema.parse({ Status: status, Authority: authority });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Invalid query parameters from Zarinpal:", error.flatten().fieldErrors);
      return NextResponse.redirect(`${PAYMENT_FAILED_URL}?error=invalid_callback_parameters`);
    }
    console.error("Unknown error parsing Zarinpal callback params:", error);
    return NextResponse.redirect(`${PAYMENT_FAILED_URL}?error=unknown_callback_error`);
  }

  if (!authority) {
    console.error("Zarinpal callback: Authority is missing.");
    return NextResponse.redirect(`${PAYMENT_FAILED_URL}?error=missing_authority`);
  }

  const cookieStore = cookies(); // ممکن است برای برخی عملیات نیاز باشد، اما معمولا در callback مستقیم استفاده نمی شود
  const supabase = createClient(cookieStore); // کلاینت سرور برای ارتباط با دیتابیس

  try {
    // 1. Fetch the transaction record using the authority
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id, order_id, amount, status, user_id')
      .eq('authority', authority)
      .maybeSingle(); // Use maybeSingle as authority should be unique

    if (transactionError || !transaction) {
      console.error(`Transaction not found for authority ${authority}:`, transactionError?.message);
      return NextResponse.redirect(`${PAYMENT_FAILED_URL}?error=transaction_not_found&authority=${authority}`);
    }

    // Prevent re-processing a completed or failed transaction
    if (transaction.status === 'completed' || transaction.status === 'failed_on_verify') {
      console.warn(`Attempt to re-verify transaction ${transaction.id} with status ${transaction.status}. Redirecting appropriately.`);
      const redirectUrl = transaction.status === 'completed' ?
          `${PAYMENT_SUCCESS_URL}?orderId=${transaction.order_id}&refId=ALREADY_VERIFIED` :
          `${PAYMENT_FAILED_URL}?orderId=${transaction.order_id}&error=already_failed`;
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Check the status from Zarinpal
    if (status === 'OK') {
      // Payment was successful at the gateway, now verify it with Zarinpal server
      // مبلغ باید با مبلغ ذخیره شده در تراکنش ما یکی باشد.
      // زرین پال مبلغ را به ریال دریافت می کند.
      const amountInRial = Math.round(parseFloat(transaction.amount as any)); // اطمینان از اینکه عدد است

      const verificationResponse = await zarinpalInstance.PaymentVerification({
        Amount: amountInRial, // به ریال
        Authority: authority,
      });

      let transactionUpdatePayload: Partial<typeof transaction> & {gateway_response?: any, verified_at?: string} = {
        status: '', // Will be set based on verification
        gateway_response: { verify: verificationResponse }, // Store verification response
      };
      let orderUpdatePayload: { status: string, updated_at: string } | null = null;


      if (verificationResponse && (verificationResponse.status === 100 || verificationResponse.status === 101)) {
        // Payment verified successfully!
        console.log(`Payment verified for authority ${authority}. RefID: ${verificationResponse.refID}`);
        transactionUpdatePayload.status = 'completed';
        transactionUpdatePayload.ref_id = String(verificationResponse.refID);
        transactionUpdatePayload.verified_at = new Date().toISOString();

        // Update order status (e.g., to 'payment_completed' or 'in_preparation')
        orderUpdatePayload = { status: 'in_preparation', updated_at: new Date().toISOString() };
                                // یا 'payment_completed' اگر مرحله دیگری بعد از پرداخت دارید.

        // Update transaction and order in DB
        const { error: updateTransactionError } = await supabase
          .from('transactions')
          .update(transactionUpdatePayload)
          .eq('id', transaction.id);

        if (updateTransactionError) throw updateTransactionError; // Propagate error

        const { error: updateOrderError } = await supabase
            .from('orders')
            .update(orderUpdatePayload)
            .eq('id', transaction.order_id);

        if (updateOrderError) {
            console.error(`Failed to update order ${transaction.order_id} status after successful payment:`, updateOrderError.message);
            // This is a critical issue: payment succeeded but order status update failed. Needs alerting/manual check.
            // For now, redirect user to success but log this.
        }

        // TODO: Notify user and chef about successful payment and order processing.
        // (e.g. via Supabase Realtime, email, or other notification system)

        return NextResponse.redirect(`${PAYMENT_SUCCESS_URL}?orderId=${transaction.order_id}&refId=${verificationResponse.refID}`);

      } else {
        // Verification failed
        console.error(`Zarinpal Verification failed for authority ${authority}. Status: ${verificationResponse?.status}, Message: ${verificationResponse?.message}`);
        transactionUpdatePayload.status = 'failed_on_verify';

        const { error: updateTransactionError } = await supabase
            .from('transactions')
            .update(transactionUpdatePayload)
            .eq('id', transaction.id);
        if (updateTransactionError) console.error("Failed to update transaction to failed_on_verify", updateTransactionError);

        return NextResponse.redirect(`${PAYMENT_FAILED_URL}?orderId=${transaction.order_id}&error=verification_failed&authority=${authority}&code=${verificationResponse?.status}`);
      }
    } else {
      // Status was 'NOK' (User cancelled or other gateway error before returning)
      console.log(`Payment cancelled or failed at gateway for authority ${authority}. Status: ${status}`);
      const dbStatus = status === 'NOK' ? 'cancelled_by_user' : 'failed_at_gateway';
      const { error: updateTransactionError } = await supabase
        .from('transactions')
        .update({ status: dbStatus, gateway_response: { callback_status: status } })
        .eq('id', transaction.id);
      if (updateTransactionError) console.error(`Failed to update transaction to ${dbStatus}`, updateTransactionError);

      if (dbStatus === 'cancelled_by_user') {
        return NextResponse.redirect(`${PAYMENT_CANCELLED_URL}?orderId=${transaction.order_id}&authority=${authority}`);
      } else {
        return NextResponse.redirect(`${PAYMENT_FAILED_URL}?orderId=${transaction.order_id}&error=gateway_error&authority=${authority}`);
      }
    }
  } catch (error) {
    console.error('Payment Verify API - Generic error:', error);
    const authorityParam = authority ? `&authority=${authority}` : '';
    const errorMessage = error instanceof Error ? error.message : 'unknown_server_error';
    return NextResponse.redirect(`${PAYMENT_FAILED_URL}?error=${encodeURIComponent(errorMessage)}${authorityParam}`);
  }
}
