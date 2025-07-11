import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Using server client for public access too
import { cookies } from 'next/headers'; // Needed for createClient, even if session not strictly required for public data

interface ChefReviewsRouteParams {
  params: {
    chefId: string;
  };
}

// GET: Fetch public reviews for a specific chef
export async function GET(request: NextRequest, { params }: ChefReviewsRouteParams) {
  const { chefId } = params;
  if (!chefId) {
    return NextResponse.json({ message: 'شناسه آشپز الزامی است.' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10); // Default 10 reviews per page
  const offset = (page - 1) * limit;

  // No specific user authentication is strictly needed for public reviews,
  // but createClient needs cookieStore.
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // First, verify the chefId corresponds to an actual chef profile (optional but good practice)
    const { data: chefProfile, error: chefError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', chefId)
      .eq('role', 'chef') // Ensure it's a chef
      .maybeSingle();

    if (chefError) {
        console.error("Error fetching chef profile for reviews:", chefError.message);
        return NextResponse.json({ message: "خطا در واکشی اطلاعات آشپز." }, { status: 500 });
    }
    if (!chefProfile) {
      return NextResponse.json({ message: 'آشپز مورد نظر یافت نشد.' }, { status: 404 });
    }

    // Fetch public reviews for the chef, joining with user's profile info (who wrote the review)
    let query = supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        order_id, -- For reference, maybe not displayed
        userProfile:profiles!reviews_user_id_fkey ( -- Alias for the user profile join
          full_name,
          avatar_url
        )
      `, { count: 'exact' }) // Get total count for pagination
      .eq('chef_id', chefId)
      .eq('is_public', true) // Only fetch public reviews
      .order('created_at', { ascending: false }) // Newest reviews first
      .range(offset, offset + limit - 1);

    const { data: reviews, error: reviewsError, count } = await query;

    if (reviewsError) {
      console.error(`Error fetching reviews for chef ${chefId}:`, reviewsError.message);
      return NextResponse.json({ message: 'خطا در دریافت لیست بازخوردها: ' + reviewsError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'لیست بازخوردها با موفقیت دریافت شد.',
      data: reviews || [],
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      }
    }, { status: 200 });

  } catch (err) {
    console.error(`GET Chef Reviews API - Generic error for chef ${chefId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
