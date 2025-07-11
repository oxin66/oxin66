import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { ReviewUpdateByAdminSchema, TReviewUpdateByAdminRequest } from '@/lib/validators/admin';
import { ZodError } from 'zod';

interface AdminReviewRouteParams {
  params: {
    reviewId: string;
  };
}

// GET: Fetch details of a specific review by Admin
export async function GET(request: NextRequest, { params }: AdminReviewRouteParams) {
  const { reviewId } = params;
  if (!reviewId) {
    return NextResponse.json({ message: 'شناسه بازخورد الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!adminUserProfile || adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز (فقط ادمین).' }, { status: 403 });
  }

  try {
    const { data: reviewDetails, error } = await supabase
      .from('reviews')
      .select(`
        *,
        userProfile:profiles!reviews_user_id_fkey (*),
        chefProfile:profiles!reviews_chef_id_fkey (*),
        order:orders!inner(id, created_at) -- get related order id
      `)
      .eq('id', reviewId)
      .maybeSingle();

    if (error) {
        console.error(`Error fetching details for review ${reviewId} by admin:`, error.message);
        return NextResponse.json({ message: 'خطا در دریافت جزئیات بازخورد: ' + error.message }, { status: 500 });
    }
    if (!reviewDetails) {
      return NextResponse.json({ message: 'بازخورد مورد نظر یافت نشد.' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'جزئیات بازخورد با موفقیت دریافت شد.',
      data: reviewDetails,
    }, { status: 200 });

  } catch (err) {
    console.error(`GET Admin Review Details API - Generic error for review ${reviewId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


// PATCH: Update a specific review by Admin
export async function PATCH(request: NextRequest, { params }: AdminReviewRouteParams) {
  const { reviewId } = params;
  if (!reviewId) {
    return NextResponse.json({ message: 'شناسه بازخورد الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!adminUserProfile || adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز (فقط ادمین).' }, { status: 403 });
  }

  let validatedRequestBody: Partial<TReviewUpdateByAdminRequest>; // Partial for PATCH
  try {
    const body = await request.json();
    validatedRequestBody = ReviewUpdateByAdminSchema.partial().parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'اطلاعات ارسال شده نامعتبر است.', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  if (Object.keys(validatedRequestBody).length === 0) {
    return NextResponse.json({ message: 'هیچ اطلاعاتی برای به‌روزرسانی ارسال نشده است.' }, { status: 400 });
  }

  // Add admin_moderation_notes to a new column in reviews table if you create it.
  // For now, it's just logged if provided in schema.
  if (validatedRequestBody.admin_moderation_notes) {
    console.log(`Admin moderation notes for review ${reviewId}: ${validatedRequestBody.admin_moderation_notes}`);
    // delete validatedRequestBody.admin_moderation_notes; // Don't try to save to a non-existent column
  }


  const updatePayload = { ...validatedRequestBody, updated_at: new Date().toISOString() };
  // Remove admin_moderation_notes if not a column in DB
  if (!('admin_moderation_notes' in (await supabase.from('reviews').select().limit(0)).data || [])) {
    delete updatePayload.admin_moderation_notes;
  }


  try {
    // Important: If rating or is_public changes, the chef's average_rating/total_reviews
    // should be recalculated. The DB trigger `on_review_change_update_chef_stats` handles this.
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update(updatePayload)
      .eq('id', reviewId)
      .select(`
        *,
        userProfile:profiles!reviews_user_id_fkey (*),
        chefProfile:profiles!reviews_chef_id_fkey (*)
      `)
      .single();

    if (updateError) {
      console.error(`Error updating review ${reviewId} by admin:`, updateError);
      return NextResponse.json({ message: 'خطا در به‌روزرسانی بازخورد: ' + updateError.message }, { status: 500 });
    }
    if (!updatedReview) {
        return NextResponse.json({ message: 'به‌روزرسانی انجام نشد، بازخورد یافت نشد پس از آپدیت.' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'بازخورد با موفقیت به‌روز شد.',
      data: updatedReview,
    }, { status: 200 });

  } catch (err) {
    console.error(`PATCH Admin Review Update API - Generic error for review ${reviewId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// DELETE: Delete a specific review by Admin
export async function DELETE(request: NextRequest, { params }: AdminReviewRouteParams) {
  const { reviewId } = params;
  if (!reviewId) {
    return NextResponse.json({ message: 'شناسه بازخورد الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!adminUserProfile || adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز (فقط ادمین).' }, { status: 403 });
  }

  try {
    // The DB trigger `on_review_change_update_chef_stats` should handle recalculating
    // chef's stats upon deletion of a review.
    const { error: deleteError, count } = await supabase
      .from('reviews')
      .delete({ count: 'exact'}) // Specify count option for Supabase v2+
      .eq('id', reviewId);

    if (deleteError) {
      console.error(`Error deleting review ${reviewId} by admin:`, deleteError);
      return NextResponse.json({ message: 'خطا در حذف بازخورد: ' + deleteError.message }, { status: 500 });
    }
    if (count === 0) {
        return NextResponse.json({ message: 'بازخورد مورد نظر برای حذف یافت نشد.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'بازخورد با موفقیت حذف شد.' }, { status: 200 }); // Or 204 No Content

  } catch (err) {
    console.error(`DELETE Admin Review API - Generic error for review ${reviewId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
