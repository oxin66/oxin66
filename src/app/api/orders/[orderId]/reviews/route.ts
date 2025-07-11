import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { ReviewSubmissionSchema, TReviewSubmissionRequest } from '@/lib/validators/review';
import { ZodError } from 'zod';

interface OrderReviewsRouteParams {
  params: {
    orderId: string;
  };
}

// POST: Submit a new review for a specific order
export async function POST(request: NextRequest, { params }: OrderReviewsRouteParams) {
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

  let validatedRequestBody: TReviewSubmissionRequest;
  try {
    const body = await request.json();
    validatedRequestBody = ReviewSubmissionSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'اطلاعات بازخورد ارسال شده نامعتبر است.', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  const { rating, comment } = validatedRequestBody;

  try {
    // 1. Fetch order details to verify ownership, status, and assigned chef
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, assigned_chef_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ message: 'سفارش مورد نظر یافت نشد.' }, { status: 404 });
    }

    if (orderData.user_id !== userProfile.id) {
      return NextResponse.json({ message: 'شما اجازه ثبت بازخورد برای این سفارش را ندارید (مالک سفارش نیستید).' }, { status: 403 });
    }

    // Ensure order status is 'completed' (or other statuses that allow review submission)
    if (orderData.status !== 'completed') {
      return NextResponse.json({ message: `فقط برای سفارشات تکمیل شده می‌توانید بازخورد ثبت کنید (وضعیت فعلی: ${orderData.status}).` }, { status: 403 });
    }

    if (!orderData.assigned_chef_id) {
        return NextResponse.json({ message: 'آشپزی برای این سفارش تخصیص داده نشده است، امکان ثبت بازخورد وجود ندارد.' }, { status: 400 });
    }

    // 2. Check if a review already exists for this order (unique constraint on order_id in reviews table handles this at DB level)
    // but a check here can provide a friendlier error.
    const { data: existingReview, error: checkReviewError } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

    if (checkReviewError && checkReviewError.code !== 'PGRST116') { // PGRST116: 0 rows found (expected if no review yet)
        console.error("Error checking for existing review:", checkReviewError.message);
        return NextResponse.json({ message: 'خطا در بررسی سابقه بازخورد.'}, {status: 500});
    }
    if (existingReview) {
        return NextResponse.json({ message: 'شما قبلاً برای این سفارش بازخورد ثبت کرده‌اید.' }, { status: 409 }); // Conflict
    }


    // 3. Insert the new review
    const { data: newReview, error: insertError } = await supabase
      .from('reviews')
      .insert({
        order_id: orderId,
        user_id: userProfile.id,
        chef_id: orderData.assigned_chef_id, // Chef who handled the order
        rating: rating,
        comment: comment,
        // is_public defaults to true in DB schema
      })
      .select() // Return the created review
      .single();

    if (insertError) {
      console.error('Error submitting review:', insertError);
      if (insertError.code === '23505') { // Unique violation on order_id
          return NextResponse.json({ message: 'شما قبلاً برای این سفارش بازخورد ثبت کرده‌اید (خطای پایگاه داده).' }, { status: 409 });
      }
      // The RLS policy "Users can create reviews..." should also prevent invalid inserts.
      // If RLS fails, Supabase might return a generic 500 or specific RLS error.
      return NextResponse.json({ message: 'خطا در ذخیره سازی بازخورد: ' + insertError.message }, { status: 500 });
    }

    // The trigger `on_review_change_update_chef_stats` in DB should automatically update
    // `average_rating` and `total_reviews` in the `profiles` table for the chef.

    // Create notification for the chef who received the review
    if (orderData.assigned_chef_id) {
        const notificationPayload = {
            user_id: orderData.assigned_chef_id,
            type: 'new_review',
            title: `بازخورد جدید برای سفارش #${orderId.substring(0,8)}`,
            message: `کاربر "${userProfile.fullName || 'ناشناس'}" برای عملکرد شما در سفارش #${orderId.substring(0,8)}، امتیاز ${rating} ستاره ثبت کرد.`,
            link_to: `/dashboard/chef/profile?tab=reviews`, // Or link to specific order/review if preferred
            metadata: {
                orderId: orderId,
                reviewId: newReview.id,
                userId: userProfile.id,
                userName: userProfile.fullName,
                rating: rating
            }
        };
        const { error: notificationError } = await supabase.from('notifications').insert(notificationPayload);
        if (notificationError) {
            console.error("Failed to create new_review notification for chef:", notificationError.message);
        }
    }

    return NextResponse.json({
      message: 'بازخورد شما با موفقیت ثبت شد. از شما سپاسگزاریم!',
      data: newReview,
    }, { status: 201 });

  } catch (error) {
    console.error('Submit Review API - Generic error:', error);
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// GET: Fetch reviews for a specific order (maybe useful for admin or user to see their submitted review in context of order)
// For now, primary way to get reviews is via /api/chefs/[chefId]/reviews
export async function GET(request: NextRequest, { params }: OrderReviewsRouteParams) {
    const { orderId } = params;
    if (!orderId) {
        return NextResponse.json({ message: 'شناسه سفارش الزامی است.' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

    if (!userProfile) {
        return NextResponse.json({ message: 'دسترسی غیرمجاز.' }, { status: 401 });
    }

    // Logic to fetch review(s) for this order
    // User should only see their review, or if admin, maybe all.
    // For simplicity, this GET might just fetch the single review if it exists and user is owner.
    const { data: review, error } = await supabase
        .from('reviews')
        .select(`
            *,
            profiles!reviews_user_id_fkey (full_name, avatar_url)
        `)
        .eq('order_id', orderId)
        .eq('user_id', userProfile.id) // User can only fetch their own review for an order this way
        .maybeSingle();

    if (error) {
        console.error("Error fetching review for order:", error.message);
        return NextResponse.json({ message: "خطا در دریافت بازخورد سفارش." }, { status: 500 });
    }

    if (!review) {
        return NextResponse.json({ message: "بازخوردی برای این سفارش توسط شما ثبت نشده است." }, { status: 404 });
    }

    return NextResponse.json({ data: review }, { status: 200 });
}
