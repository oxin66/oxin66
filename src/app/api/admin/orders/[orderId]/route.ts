import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { OrderStatusUpdateByAdminSchema, TOrderStatusUpdateByAdminRequest } from '@/lib/validators/admin';
import { ZodError } from 'zod';

interface AdminOrderRouteParams {
  params: {
    orderId: string;
  };
}

// GET: Fetch details of a specific order by Admin
export async function GET(request: NextRequest, { params }: AdminOrderRouteParams) {
  const { orderId } = params;
  if (!orderId) {
    return NextResponse.json({ message: 'شناسه سفارش الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!adminUserProfile || adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز (فقط ادمین).' }, { status: 403 });
  }

  try {
    // Fetch comprehensive order details
    const { data: orderDetails, error } = await supabase
      .from('orders')
      .select(`
        *,
        userProfile:profiles!orders_user_id_fkey (*),
        chefProfile:profiles!orders_assigned_chef_id_fkey (*),
        bids!order_id (
            *,
            bidderProfile:profiles!bids_chef_id_fkey (*)
        ),
        reviews!order_id (
            *,
            reviewerProfile:profiles!reviews_user_id_fkey (*)
        ),
        transactions!order_id (*),
        chat_rooms!order_id (id) -- Join to get chat room ID if exists
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
        console.error(`Error fetching details for order ${orderId} by admin:`, error.message);
        return NextResponse.json({ message: 'خطا در دریافت جزئیات سفارش: ' + error.message }, { status: 500 });
    }
    if (!orderDetails) {
      return NextResponse.json({ message: 'سفارش مورد نظر یافت نشد.' }, { status: 404 });
    }

    // Normalize reviews and bids if they are arrays from the join (Supabase might return array for one-to-one if not careful with FKs)
    if (orderDetails.reviews && Array.isArray(orderDetails.reviews)) {
        (orderDetails as any).reviews = orderDetails.reviews[0] || null;
    }
    // Bids are one-to-many, so array is expected.

    return NextResponse.json({
      message: 'جزئیات سفارش با موفقیت دریافت شد.',
      data: orderDetails,
    }, { status: 200 });

  } catch (err) {
    console.error(`GET Admin Order Details API - Generic error for order ${orderId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


// PATCH: Update a specific order's status by Admin
export async function PATCH(request: NextRequest, { params }: AdminOrderRouteParams) {
  const { orderId } = params;
  if (!orderId) {
    return NextResponse.json({ message: 'شناسه سفارش الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!adminUserProfile || adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز (فقط ادمین).' }, { status: 403 });
  }

  let validatedRequestBody: TOrderStatusUpdateByAdminRequest;
  try {
    const body = await request.json();
    validatedRequestBody = OrderStatusUpdateByAdminSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'اطلاعات ارسال شده نامعتبر است.', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  const { status: newStatus, admin_reason } = validatedRequestBody;

  // TODO: Add a list of valid order statuses to check against, or use an enum in DB
  const validOrderStatuses = [
      'pending_bids', 'chef_selected', 'awaiting_payment', 'payment_completed',
      'in_preparation', 'ready_for_delivery', 'out_for_delivery', 'delivered',
      'completed', 'cancelled_by_user', 'cancelled_by_chef', 'cancelled_by_admin', 'disputed'
  ];
  if (!validOrderStatuses.includes(newStatus)) {
      return NextResponse.json({ message: `وضعیت '${newStatus}' برای سفارش معتبر نیست.` }, { status: 400 });
  }

  try {
    // Fetch current order to log the change or for other checks if needed
    const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('id', orderId)
        .single();

    if (fetchError || !currentOrder) {
        return NextResponse.json({ message: 'سفارش مورد نظر برای به‌روزرسانی یافت نشد.' }, { status: 404 });
    }

    // Log the admin action (ideally to a separate audit log table)
    console.log(`Admin ${adminUserProfile.id} changing order ${orderId} status from ${currentOrder.status} to ${newStatus}. Reason: ${admin_reason || 'N/A'}`);

    // Add admin_reason to a new column 'admin_status_change_reason' in orders table if you create it.
    // For now, it's just logged.
    const updatePayload = {
        status: newStatus,
        updated_at: new Date().toISOString(),
        // admin_status_change_reason: admin_reason // If column exists
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select() // Return the updated order
      .single();

    if (updateError) {
      console.error(`Error updating order ${orderId} status by admin:`, updateError);
      return NextResponse.json({ message: 'خطا در به‌روزرسانی وضعیت سفارش: ' + updateError.message }, { status: 500 });
    }
    if (!updatedOrder) {
        return NextResponse.json({ message: 'به‌روزرسانی انجام نشد، سفارش یافت نشد پس از آپدیت.' }, { status: 404 });
    }

    // TODO: Send notifications to user/chef about the status change by admin.
    const orderOwnerId = updatedOrder.user_id;
    const assignedChefId = updatedOrder.assigned_chef_id;

    const commonNotificationData = {
        type: 'order_status_changed',
        title: `وضعیت سفارش #${orderId.substring(0,8)} تغییر کرد`,
        message: `وضعیت سفارش شما #${orderId.substring(0,8)} توسط مدیریت به '${newStatus}' تغییر یافت. ${admin_reason ? `دلیل: ${admin_reason}` : ''}`,
        link_to: `/dashboard/user/orders/${orderId}`, // Default link for user
        metadata: { orderId: orderId, newStatus: newStatus, changedBy: 'admin', adminReason: admin_reason }
    };

    // Notify order owner
    if (orderOwnerId) {
        const { error: userNoError } = await supabase.from('notifications').insert({ ...commonNotificationData, user_id: orderOwnerId });
        if (userNoError) console.error(`Failed to notify user ${orderOwnerId} about order status change: ${userNoError.message}`);
    }
    // Notify assigned chef (if any and if status is relevant to them)
    if (assignedChefId) {
        const chefNotificationPayload = {
            ...commonNotificationData,
            user_id: assignedChefId,
            message: `وضعیت سفارش #${orderId.substring(0,8)} که به شما تخصیص داده شده بود، توسط مدیریت به '${newStatus}' تغییر یافت. ${admin_reason ? `دلیل: ${admin_reason}` : ''}`,
            link_to: `/dashboard/chef/orders/${orderId}` // Or active orders page
        };
        const { error: chefNoError } = await supabase.from('notifications').insert(chefNotificationPayload);
        if (chefNoError) console.error(`Failed to notify chef ${assignedChefId} about order status change: ${chefNoError.message}`);
    }


    return NextResponse.json({
      message: `وضعیت سفارش با موفقیت به '${newStatus}' تغییر یافت.`,
      data: updatedOrder,
    }, { status: 200 });

  } catch (err) {
    console.error(`PATCH Admin Order Update API - Generic error for order ${orderId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
