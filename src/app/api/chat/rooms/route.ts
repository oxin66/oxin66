import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';

// GET: Fetch all chat rooms for the current user
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  try {
    // Fetch rooms where the current user is either user_id or chef_id
    // Also fetch related data: other participant's profile, last message, unread count.
    // This query can be complex. Supabase RPC functions might be better for performance.

    // Step 1: Fetch rooms the user is part of
    const { data: rooms, error: roomsError } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        order_id,
        user_id,
        chef_id,
        updated_at,
        user_last_seen_at,
        chef_last_seen_at,
        userProfile:profiles!chat_rooms_user_id_fkey (id, full_name, avatar_url, role),
        chefProfile:profiles!chat_rooms_chef_id_fkey (id, full_name, avatar_url, role),
        orders (id, status) -- Include order status if needed
      `)
      .or(`user_id.eq.${userProfile.id},chef_id.eq.${userProfile.id}`)
      .order('updated_at', { ascending: false }); // Show most recently active rooms first

    if (roomsError) {
      console.error('Error fetching chat rooms:', roomsError.message);
      return NextResponse.json({ message: 'خطا در دریافت لیست اتاق‌های چت: ' + roomsError.message }, { status: 500 });
    }

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ message: 'هیچ اتاق چتی یافت نشد.', data: [] }, { status: 200 });
    }

    // Step 2: For each room, fetch the last message and unread count (can be N+1 query problem)
    // To optimize, consider a Supabase Edge Function (RPC) or denormalizing last_message_preview and unread_count into chat_rooms table.
    // For now, performing N+1 for simplicity in MVP.

    const roomsWithDetails = await Promise.all(
      rooms.map(async (room) => {
        // Determine other participant
        const otherParticipantProfile = userProfile.id === room.user_id ? room.chefProfile : room.userProfile;

        // Fetch last message
        const { data: lastMessageData, error: lastMessageError } = await supabase
          .from('chat_messages')
          .select('content, created_at, sender_id')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMessageError) {
          console.warn(`Could not fetch last message for room ${room.id}:`, lastMessageError.message);
        }

        // Calculate unread messages count
        const lastSeenTimestamp = userProfile.id === room.user_id ? room.user_last_seen_at : room.chef_last_seen_at;
        let unreadCount = 0;
        if (lastMessageData && lastMessageData.created_at && (!lastSeenTimestamp || new Date(lastMessageData.created_at) > new Date(lastSeenTimestamp))) {
            // If there's a last message and it's newer than last_seen_at, then there's at least one unread.
            // A more accurate count requires counting messages after last_seen_at.
            const { count, error: unreadError } = await supabase
                .from('chat_messages')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', room.id)
                .gt('created_at', lastSeenTimestamp || '1970-01-01T00:00:00Z') // Count messages after last seen
                .neq('sender_id', userProfile.id); // Only count messages not sent by current user

            if (unreadError) {
                console.warn(`Could not count unread messages for room ${room.id}:`, unreadError.message);
            } else {
                unreadCount = count || 0;
            }
        }


        return {
          ...room,
          otherParticipant: {
            id: otherParticipantProfile?.id,
            full_name: otherParticipantProfile?.full_name,
            avatar_url: otherParticipantProfile?.avatar_url,
            role: otherParticipantProfile?.role,
          },
          lastMessage: lastMessageData ? {
            content: lastMessageData.content,
            created_at: lastMessageData.created_at,
            isOwnMessage: lastMessageData.sender_id === userProfile.id,
          } : null,
          unreadMessagesCount: unreadCount,
        };
      })
    );

    return NextResponse.json({
      message: 'لیست اتاق‌های چت با موفقیت دریافت شد.',
      data: roomsWithDetails,
    }, { status: 200 });

  } catch (error) {
    console.error('GET Chat Rooms API - Generic error:', error);
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
