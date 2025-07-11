import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';

interface MarkReadParams {
  params: {
    notificationId: string;
  };
}

// PATCH: Mark a specific notification as read
export async function PATCH(request: NextRequest, { params }: MarkReadParams) {
  const { notificationId } = params;
  if (!notificationId) {
    return NextResponse.json({ message: 'شناسه نوتیفیکیشن الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  try {
    const { data: updatedNotification, error, count } = await supabase
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() }) // Also update updated_at if desired
      .eq('id', notificationId)
      .eq('user_id', userProfile.id) // Ensure user can only mark their own notifications
      .eq('is_read', false) // Only update if it's currently unread, to avoid unnecessary updates
      .select('id, is_read') // Return minimal data
      .maybeSingle(); // Use maybeSingle as it might already be read or not exist

    if (error) {
      console.error(`Error marking notification ${notificationId} as read:`, error.message);
      return NextResponse.json({ message: 'خطا در به‌روزرسانی وضعیت نوتیفیکیشن: ' + error.message }, { status: 500 });
    }

    if (!updatedNotification && count === 0) {
      // This means either notification doesn't exist, doesn't belong to user, or was already read.
      // Check if it exists and belongs to user but was already read.
      const { data: existingNotification, error: fetchError } = await supabase
        .from('notifications')
        .select('id, is_read')
        .eq('id', notificationId)
        .eq('user_id', userProfile.id)
        .single();

      if (existingNotification?.is_read) {
        return NextResponse.json({ message: 'نوتیفیکیشن قبلاً خوانده شده است.', data: existingNotification }, { status: 200 });
      }
      // If it doesn't exist or doesn't belong to user, RLS should prevent access, but an explicit check is good.
      return NextResponse.json({ message: 'نوتیفیکیشن یافت نشد یا قبلاً خوانده شده است.' }, { status: 404 });
    }

    // Supabase Realtime should pick up this change if subscribed to this notification or user's notifications.

    return NextResponse.json({
      message: 'نوتیفیکیشن با موفقیت خوانده شد.',
      data: updatedNotification, // Contains id and is_read: true
    }, { status: 200 });

  } catch (err) {
    console.error(`PATCH Mark Notification Read API - Generic error for notification ${notificationId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
