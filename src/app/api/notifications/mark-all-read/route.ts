import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';

// POST: Mark all unread notifications for the logged-in user as read
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  try {
    // Update all unread notifications for the user to is_read = true
    // The { count: 'exact' } option on update is not standard for Supabase,
    // but we can get the count of affected rows from the response if the client library supports it.
    // Supabase JS client's update method returns { data, error, count }.
    const { error, count } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userProfile.id)
      .eq('is_read', false); // Only target unread notifications
      // .select(); // Optional: return updated notifications, but can be many

    if (error) {
      console.error('Error marking all notifications as read:', error.message);
      return NextResponse.json({ message: 'خطا در به‌روزرسانی وضعیت نوتیفیکیشن‌ها: ' + error.message }, { status: 500 });
    }

    // Supabase Realtime should pick up these changes if clients are subscribed appropriately.

    return NextResponse.json({
      message: `تعداد ${count || 0} نوتیفیکیشن با موفقیت خوانده شد.`,
      count: count || 0, // Number of notifications that were updated
    }, { status: 200 });

  } catch (err) {
    console.error('POST Mark All Notifications Read API - Generic error:', err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
