import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';

// GET: Fetch all reviews for admin panel
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!adminUserProfile || adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز (فقط ادمین).' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '15', 10);
  const offset = (page - 1) * limit;

  const ratingFilter = searchParams.get('rating'); // Filter by exact rating
  const chefIdFilter = searchParams.get('chefId');
  const userIdFilter = searchParams.get('userId');
  const isPublicFilter = searchParams.get('isPublic'); // 'true' or 'false'
  const searchQuery = searchParams.get('q'); // Search in comment text

  try {
    let query = supabase
      .from('reviews')
      .select(`
        id,
        order_id,
        rating,
        comment,
        is_public,
        created_at,
        userProfile:profiles!reviews_user_id_fkey (id, full_name, email),
        chefProfile:profiles!reviews_chef_id_fkey (id, full_name, email)
      `, { count: 'exact' });

    if (ratingFilter) {
      const ratingNum = parseInt(ratingFilter, 10);
      if (!isNaN(ratingNum) && ratingNum >= 1 && ratingNum <= 5) {
        query = query.eq('rating', ratingNum);
      }
    }
    if (chefIdFilter) {
      query = query.eq('chef_id', chefIdFilter);
    }
    if (userIdFilter) {
      query = query.eq('user_id', userIdFilter);
    }
    if (isPublicFilter !== null && (isPublicFilter === 'true' || isPublicFilter === 'false')) {
      query = query.eq('is_public', isPublicFilter === 'true');
    }
    if (searchQuery) {
      // Using textSearch for comment. Ensure 'comment' column is configured for FTS or use ilike.
      // query = query.textSearch('comment', searchQuery, { type: 'plain' });
      // Using ilike for broader compatibility without FTS setup:
      query = query.ilike('comment', `%${searchQuery}%`);
    }

    query = query.order('created_at', { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: reviews, error, count } = await query;

    if (error) {
      console.error('Error fetching reviews for admin:', error.message);
      return NextResponse.json({ message: 'خطا در دریافت لیست بازخوردها: ' + error.message }, { status: 500 });
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
    console.error('GET Admin Reviews API - Generic error:', err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
