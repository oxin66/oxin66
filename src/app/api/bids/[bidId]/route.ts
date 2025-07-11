import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { BidUpdateStatusSchema, TBidUpdateStatusRequest } from '@/lib/validators/bid';
import { ZodError } from 'zod';

interface RouteParams {
  params: {
    bidId: string;
  };
}

// PATCH: Update the status of a specific bid
// Used by:
// 1. Order owner to 'accept' or 'reject' a 'pending' bid.
// 2. Bidding chef to 'withdraw_by_chef' their own 'pending' bid.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { bidId } = params;
  if (!bidId) {
    return NextResponse.json({ message: 'شناسه پیشنهاد الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  let validatedStatusData: TBidUpdateStatusRequest;
  try {
    const body = await request.json();
    validatedStatusData = BidUpdateStatusSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.reduce((acc, curr) => {
        acc[curr.path.join('.')] = curr.message;
        return acc;
      }, {} as Record<string, string>);
      return NextResponse.json({ message: 'اطلاعات وضعیت ارسال شده نامعتبر است.', errors: formattedErrors }, { status: 400 });
    }
    console.error('Bid Status API - JSON parsing error:', error);
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  const newStatus = validatedStatusData.status;

  try {
    // Fetch the bid to check its current status and ownership
    const { data: bidData, error: bidFetchError } = await supabase
      .from('bids')
      .select('id, order_id, chef_id, status, bid_amount, profiles!bids_chef_id_fkey(id, full_name)') // Include order_id and chef_id for checks
      .eq('id', bidId)
      .single();

    if (bidFetchError || !bidData) {
      return NextResponse.json({ message: 'پیشنهاد مورد نظر یافت نشد.' }, { status: 404 });
    }

    if (bidData.status !== 'pending') {
      return NextResponse.json({ message: `این پیشنهاد دیگر در وضعیت 'pending' نیست و قابل تغییر وضعیت به '${newStatus}' توسط شما نمی‌باشد.` }, { status: 403 });
    }

    // Authorization checks based on user role and desired new status
    if (newStatus === 'accepted' || newStatus === 'rejected') {
      // Action by Order Owner
      const { data: orderData, error: orderFetchError } = await supabase
        .from('orders')
        .select('id, user_id, status')
        .eq('id', bidData.order_id)
        .single();

      if (orderFetchError || !orderData) {
        return NextResponse.json({ message: 'سفارش مرتبط با این پیشنهاد یافت نشد.' }, { status: 404 });
      }
      if (orderData.user_id !== userProfile.id) {
        return NextResponse.json({ message: 'شما اجازه تغییر وضعیت این پیشنهاد را ندارید (مالک سفارش نیستید).' }, { status: 403 });
      }
      if (orderData.status !== 'pending_bids') {
        return NextResponse.json({ message: 'این سفارش دیگر در وضعیت انتخاب پیشنهاد نیست.' }, { status: 403 });
      }

      // Update bid status
      const { data: updatedBid, error: updateBidError } = await supabase
        .from('bids')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bidId)
        .eq('status', 'pending') // Ensure it's still pending before updating
        .select()
        .single();

      if (updateBidError) {
        console.error('Error updating bid status (user action):', updateBidError.message);
        return NextResponse.json({ message: 'خطا در به‌روزرسانی وضعیت پیشنهاد: ' + updateBidError.message }, { status: 500 });
      }
      if (!updatedBid) {
        return NextResponse.json({ message: 'به‌روزرسانی وضعیت پیشنهاد انجام نشد، ممکن است وضعیت آن تغییر کرده باشد.' }, { status: 409 }); // Conflict
      }


      if (newStatus === 'accepted') {
        // ** CRITICAL SECTION: Handle bid acceptance **
        // 1. Update the main order: status, assigned_chef_id, final_bid_amount, accepted_bid_id
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({
            status: 'chef_selected', // Or 'awaiting_payment' if payment is next
            assigned_chef_id: bidData.chef_id,
            final_bid_amount: bidData.bid_amount, // Assuming bid_amount is the final amount
            accepted_bid_id: bidData.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bidData.order_id)
          .eq('status', 'pending_bids'); // Ensure order is still pending_bids

        if (updateOrderError) {
          console.error('Error updating order after bid acceptance:', updateOrderError.message);
          // Potentially try to revert bid status if order update fails (complex rollback)
          return NextResponse.json({ message: 'پیشنهاد پذیرفته شد اما به‌روزرسانی سفارش اصلی با خطا مواجه شد: ' + updateOrderError.message }, { status: 500 });
        }

        // 2. (Optional but good practice) Reject other pending bids for this order
        const { error: rejectOthersError } = await supabase
          .from('bids')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('order_id', bidData.order_id)
          .neq('id', bidId) // Don't reject the accepted bid
          .eq('status', 'pending');

        if (rejectOthersError) {
          console.warn('Warning: Could not reject other pending bids:', rejectOthersError.message);
        }

        // 3. Create a chat room for this order if it doesn't exist
        const { data: existingChatRoom, error: chatRoomCheckError } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('order_id', bidData.order_id)
          .maybeSingle();

        if (chatRoomCheckError) {
          console.error('Error checking for existing chat room:', chatRoomCheckError.message);
          // Not critical enough to fail the bid acceptance, but log it.
        }

        if (!existingChatRoom && !chatRoomCheckError) {
          const { error: createChatRoomError } = await supabase
            .from('chat_rooms')
            .insert({
              order_id: bidData.order_id,
              user_id: orderData.user_id, // User who owns the order
              chef_id: bidData.chef_id,   // Chef whose bid was accepted
              updated_at: new Date().toISOString(), // Initialize updated_at
            });

          if (createChatRoomError) {
            console.error('Error creating chat room:', createChatRoomError.message);
            // Also not critical enough to fail bid acceptance, but needs logging/monitoring.
          } else {
            console.log(`Chat room created for order ${bidData.order_id}`);
          }
        }
        // TODO: Emit WebSocket events (Supabase Realtime will handle this via table subscription)

        // Create notification for the chef whose bid status changed
        const chefToNotifyId = bidData.chef_id;
        let notificationTitle = '';
        let notificationMessage = '';
        let notificationType: 'bid_accepted' | 'bid_rejected' = 'bid_rejected'; // Default, will be overwritten

        if (newStatus === 'accepted') {
          notificationType = 'bid_accepted';
          notificationTitle = `پیشنهاد شما برای سفارش #${bidData.order_id.substring(0,8)} پذیرفته شد!`;
          notificationMessage = `کاربر پیشنهاد شما را برای سفارش ${bidData.order_id.substring(0,8)} پذیرفت. برای هماهنگی‌های بیشتر به بخش گفتگو مراجعه کنید.`;
        } else if (newStatus === 'rejected') {
          notificationType = 'bid_rejected';
          notificationTitle = `پیشنهاد شما برای سفارش #${bidData.order_id.substring(0,8)} رد شد.`;
          notificationMessage = `متأسفانه کاربر پیشنهاد شما را برای سفارش ${bidData.order_id.substring(0,8)} رد کرد.`;
        }

        if (chefToNotifyId && (newStatus === 'accepted' || newStatus === 'rejected')) {
            const notificationPayload = {
                user_id: chefToNotifyId,
                type: notificationType,
                title: notificationTitle,
                message: notificationMessage,
                link_to: `/dashboard/chef/orders/${bidData.order_id}`, // Link to the order details for chef
                metadata: { orderId: bidData.order_id, bidId: bidId }
            };
            const { error: notificationError } = await supabase.from('notifications').insert(notificationPayload);
            if (notificationError) {
                console.error(`Failed to create ${notificationType} notification for chef ${chefToNotifyId}:`, notificationError.message);
            }
        }
        // TODO: Notify user/chef about chat room creation if bid was accepted (already handled by chat room creation logic if it sends its own notification)

      } else { // newStatus === 'rejected' (This else block is now part of the if above)
        // Logic for 'rejected' is handled within the 'accepted' || 'rejected' block
      }
      return NextResponse.json({ message: `پیشنهاد با موفقیت '${newStatus === 'accepted' ? 'پذیرفته' : 'رد'}' شد.`, data: updatedBid }, { status: 200 });

    } else if (newStatus === 'withdrawn_by_chef') {
      // Action by Bidding Chef
      if (bidData.chef_id !== userProfile.id) {
        return NextResponse.json({ message: 'شما اجازه پس گرفتن این پیشنهاد را ندارید (مالک پیشنهاد نیستید).' }, { status: 403 });
      }

      const { data: updatedBid, error: updateError } = await supabase
        .from('bids')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', bidId)
        .eq('chef_id', userProfile.id)
        .eq('status', 'pending')
        .select()
        .single();

      if (updateError) {
        console.error('Error withdrawing bid (chef action):', updateError.message);
        return NextResponse.json({ message: 'خطا در پس گرفتن پیشنهاد: ' + updateError.message }, { status: 500 });
      }
       if (!updatedBid) {
        return NextResponse.json({ message: 'پس گرفتن پیشنهاد انجام نشد، ممکن است وضعیت آن تغییر کرده باشد.' }, { status: 409 });
      }

      // Create notification for the order owner that a bid was withdrawn
      const orderOwnerId = (await supabase.from('orders').select('user_id').eq('id', bidData.order_id).single()).data?.user_id;
      if (orderOwnerId) {
        const notificationPayload = {
            user_id: orderOwnerId,
            type: 'bid_withdrawn',
            title: `یک پیشنهاد برای سفارش #${bidData.order_id.substring(0,8)} پس گرفته شد`,
            message: `آشپز "${userProfile.fullName || 'ناشناس'}" پیشنهاد خود را برای سفارش شما پس گرفت.`,
            link_to: `/dashboard/user/orders/${bidData.order_id}`,
            metadata: { orderId: bidData.order_id, bidId: bidId, chefId: userProfile.id }
        };
        const { error: notificationError } = await supabase.from('notifications').insert(notificationPayload);
        if (notificationError) {
            console.error(`Failed to create bid_withdrawn notification for user ${orderOwnerId}:`, notificationError.message);
        }
      }
      return NextResponse.json({ message: 'پیشنهاد شما با موفقیت پس گرفته شد.', data: updatedBid }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'عملیات وضعیت نامعتبر است.' }, { status: 400 });
    }

  } catch (error) {
    console.error('PATCH Bid Status API - Generic error:', error);
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
