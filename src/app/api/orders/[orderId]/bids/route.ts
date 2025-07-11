import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { BidCreationSchema, TBidCreationRequest } from '@/lib/validators/bid';
import { ZodError } from 'zod';

interface RouteParams {
  params: {
    orderId: string;
  };
}

// GET: Fetch bids for a specific order (for the order owner)
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    // First, verify the current user is the owner of the order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      console.error('Error fetching order or order not found:', orderError?.message);
      return NextResponse.json({ message: 'سفارش مورد نظر یافت نشد یا خطایی در دسترسی به آن رخ داد.' }, { status: 404 });
    }

    // Allow admin to view bids as well, or only order owner
    if (orderData.user_id !== userProfile.id && userProfile.role !== 'admin') {
      return NextResponse.json({ message: 'شما اجازه مشاهده پیشنهادات این سفارش را ندارید.' }, { status: 403 });
    }

    // Fetch bids for the order, joining with chef's profile info
    const { data: bids, error: bidsError } = await supabase
      .from('bids')
      .select(`
        *,
        profiles!bids_chef_id_fkey (
          id,
          full_name,
          avatar_url,
          average_rating,
          total_reviews
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }); // Show oldest bids first, or based on preference

    if (bidsError) {
      console.error('Error fetching bids:', bidsError.message);
      return NextResponse.json({ message: 'خطا در دریافت پیشنهادات: ' + bidsError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'پیشنهادات با موفقیت دریافت شدند.',
      data: bids,
    }, { status: 200 });

  } catch (error) {
    console.error('GET Bids API - Generic error:', error);
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


// POST: Create a new bid for a specific order (for chefs)
export async function POST(request: NextRequest, { params }: RouteParams) {
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

  if (userProfile.role !== 'chef' && userProfile.role !== 'admin') { // Assuming admin can also bid for testing or specific scenarios
    return NextResponse.json({ message: 'فقط آشپزها می‌توانند پیشنهاد ثبت کنند.' }, { status: 403 });
  }

  // Check if the chef is verified
  if (userProfile.verification_status !== 'approved') {
    return NextResponse.json({
      message: 'حساب کاربری آشپزی شما هنوز توسط ادمین تأیید نشده است. پس از تأیید، قادر به ارسال پیشنهاد خواهید بود.',
      reason: 'chef_not_verified'
    }, { status: 403 });
  }

  let validatedBidData: TBidCreationRequest;
  try {
    const body = await request.json();
    validatedBidData = BidCreationSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.reduce((acc, curr) => {
        acc[curr.path.join('.')] = curr.message;
        return acc;
      }, {} as Record<string, string>);
      return NextResponse.json({ message: 'اطلاعات وارد شده برای پیشنهاد نامعتبر است.', errors: formattedErrors }, { status: 400 });
    }
    console.error('Bid API - JSON parsing error:', error);
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  try {
    // 1. Check if the order exists, is in 'pending_bids' status, and does not belong to the bidding chef
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ message: 'سفارش مورد نظر یافت نشد.' }, { status: 404 });
    }
    if (orderData.user_id === userProfile.id) {
      return NextResponse.json({ message: 'شما نمی‌توانید برای سفارش خودتان پیشنهاد ثبت کنید.' }, { status: 403 });
    }
    if (orderData.status !== 'pending_bids') {
      return NextResponse.json({ message: 'این سفارش دیگر در وضعیت دریافت پیشنهاد نیست.' }, { status: 403 });
    }

    // 2. (Handled by DB unique constraint & RLS) Check if this chef already has an active bid for this order
    // The RLS policy "Chefs can create bids..." and the unique index idx_unique_pending_bid_per_order_chef
    // should prevent inserting multiple active bids from the same chef for the same order.

    // 3. Insert the new bid
    const { data: newBid, error: insertError } = await supabase
      .from('bids')
      .insert({
        order_id: orderId,
        chef_id: userProfile.id, // The bidding chef
        bid_amount: validatedBidData.bid_amount,
        estimated_delivery_time_minutes: validatedBidData.estimated_delivery_time_minutes,
        chef_notes: validatedBidData.chef_notes,
        status: 'pending', // Default status for new bids
      })
      .select(`
        *,
        profiles!bids_chef_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .single();

    if (insertError) {
      console.error('Supabase bid insert error:', insertError);
      if (insertError.code === '23505') { // Unique violation (e.g., idx_unique_pending_bid_per_order_chef)
          return NextResponse.json({ message: 'شما قبلاً یک پیشنهاد فعال برای این سفارش ثبت کرده‌اید. برای ارسال پیشنهاد جدید، ابتدا پیشنهاد قبلی خود را پس بگیرید.' }, { status: 409 }); // 409 Conflict
      }
      if (insertError.message.includes("new row violates row-level security policy for table \\\"bids\\\"")) {
        // This can happen if RLS conditions are not met (e.g., order not pending_bids, or chef trying to bid on own order if RLS checks that)
        return NextResponse.json({ message: 'شما اجازه ثبت پیشنهاد برای این سفارش را ندارید یا شرایط سفارش مناسب نیست.' }, { status: 403 });
      }
      return NextResponse.json({ message: 'خطا در ذخیره سازی پیشنهاد: ' + insertError.message }, { status: 500 });
    }

    if (!newBid) {
        console.error('Bid API - New bid data is null despite no insert error.');
        return NextResponse.json({ message: 'پیشنهاد ایجاد شد اما اطلاعات آن بازگردانده نشد.' }, { status: 500 });
    }

    // TODO: Emit a WebSocket event to the order owner about the new bid (Supabase Realtime will handle this via table subscription)

    // Create notification for the order owner
    if (orderData.user_id) {
      const notificationPayload = {
        user_id: orderData.user_id,
        type: 'new_bid',
        title: `پیشنهاد جدید برای سفارش شما #${orderId.substring(0, 8)}`,
        message: `آشپز "${newBid.profiles?.full_name || 'ناشناس'}" برای سفارش شما پیشنهادی ارسال کرده است.`,
        link_to: `/dashboard/user/orders/${orderId}`,
        metadata: {
          orderId: orderId,
          bidId: newBid.id,
          chefId: newBid.chef_id,
          chefName: newBid.profiles?.full_name
        }
      };
      const { error: notificationError } = await supabase.from('notifications').insert(notificationPayload);
      if (notificationError) {
        console.error("Failed to create new_bid notification:", notificationError.message);
        // Non-critical, so don't fail the whole request
      }
    }

    return NextResponse.json({
      message: 'پیشنهاد شما با موفقیت ثبت شد.',
      data: newBid,
    }, { status: 201 });

  } catch (error) {
    console.error('POST Bid API - Generic error:', error);
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
