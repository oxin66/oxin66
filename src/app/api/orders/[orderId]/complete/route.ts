import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';

interface CompleteOrderRouteParams {
  params: {
    orderId: string;
  };
}

// POST: Mark an order as 'completed' by the user who owns it
export async function POST(request: NextRequest, { params }: CompleteOrderRouteParams) {
  const { orderId } = params;
  if (!orderId) {
    return NextResponse.json({ message: 'شناسه سفارش الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  try {
    // 1. Fetch order details to verify ownership and current status
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, assigned_chef_id')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ message: 'سفارش مورد نظر یافت نشد.' }, { status: 404 });
    }

    if (orderData.user_id !== userProfile.id) {
      return NextResponse.json({ message: 'شما اجازه تغییر وضعیت این سفارش را ندارید (مالک سفارش نیستید).' }, { status: 403 });
    }

    // Define statuses from which a user can mark an order as 'completed'
    // For example, after it's 'delivered', or even 'in_preparation' / 'ready_for_delivery' in a simplified MVP workflow
    const completableStatuses = ['delivered', 'out_for_delivery', 'ready_for_delivery', 'in_preparation', 'payment_completed', 'chef_selected'];
    if (!completableStatuses.includes(orderData.status)) {
      return NextResponse.json({
        message: `این سفارش در حال حاضر در وضعیتی نیست که بتوانید آن را تکمیل کنید (وضعیت فعلی: ${orderData.status}).`
      }, { status: 403 });
    }

    if (!orderData.assigned_chef_id) {
        // This case should ideally not happen if status is one of the above, but as a safeguard
        return NextResponse.json({ message: 'هنوز آشپزی برای این سفارش انتخاب نشده است.' }, { status: 400 });
    }

    // 2. Update the order status to 'completed'
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select() // Return the updated order
      .single();

    if (updateError) {
      console.error('Error completing order:', updateError);
      return NextResponse.json({ message: 'خطا در تکمیل سفارش: ' + updateError.message }, { status: 500 });
    }

    // TODO: Notify the chef that the order has been marked as completed by the user.

    return NextResponse.json({
      message: 'سفارش با موفقیت تکمیل شد. اکنون می‌توانید بازخورد خود را ثبت کنید.',
      data: updatedOrder,
    }, { status: 200 });

  } catch (error) {
    console.error('Complete Order API - Generic error:', error);
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
