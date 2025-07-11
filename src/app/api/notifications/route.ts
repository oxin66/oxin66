import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';

// GET: Fetch notifications for the logged-in user
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  // Show more notifications per page by default compared to other lists
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = (page - 1) * limit;
  const unreadOnly = searchParams.get('unreadOnly') === 'true'; // Option to fetch only unread

  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' }) // Select all fields of a notification
      .eq('user_id', userProfile.id);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    // Order by creation date, unread first, then newest created_at
    query = query
        .order('is_read', { ascending: true }) // false (unread) comes before true (read)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications for user:', error.message);
      return NextResponse.json({ message: 'خطا در دریافت لیست نوتیفیکیشن‌ها: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'نوتیفیکیشن‌ها با موفقیت دریافت شدند.',
      data: notifications || [],
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      }
    }, { status: 200 });

  } catch (err) {
    console.error('GET User Notifications API - Generic error:', err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
