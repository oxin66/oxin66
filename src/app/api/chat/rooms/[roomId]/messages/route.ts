import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { ChatMessageContentSchema, TChatMessageContentRequest } from '@/lib/validators/chat';
import { ZodError } from 'zod';

interface RoomMessagesRouteParams {
  params: {
    roomId: string;
  };
}

// GET: Fetch messages for a specific chat room
export async function GET(request: NextRequest, { params }: RoomMessagesRouteParams) {
  const { roomId } = params;
  if (!roomId) {
    return NextResponse.json({ message: 'شناسه اتاق چت الزامی است.' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '30', 10); // Default 30 messages per page
  const offset = (page - 1) * limit;

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  try {
    // 1. Verify user is a participant of the room
    const { data: roomData, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id, user_id, chef_id')
      .eq('id', roomId)
      .or(`user_id.eq.${userProfile.id},chef_id.eq.${userProfile.id}`) // User must be part of the room
      .maybeSingle();

    if (roomError || !roomData) {
      console.error('Error fetching chat room or not a participant:', roomError?.message);
      return NextResponse.json({ message: 'اتاق چت یافت نشد یا شما اجازه دسترسی به آن را ندارید.' }, { status: roomData ? 403 : 404 });
    }

    // 2. Fetch messages for the room
    const { data: messages, error: messagesError, count } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles!chat_messages_sender_id_fkey (
          id,
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false }) // Newest messages first for typical chat UI (then reverse on client)
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error('Error fetching chat messages:', messagesError.message);
      return NextResponse.json({ message: 'خطا در دریافت پیام‌ها: ' + messagesError.message }, { status: 500 });
    }

    // 3. Update last_seen_at for the current user in this room
    const lastSeenUpdateField = userProfile.id === roomData.user_id ? 'user_last_seen_at' : 'chef_last_seen_at';
    const { error: updateSeenError } = await supabase
        .from('chat_rooms')
        .update({ [lastSeenUpdateField]: new Date().toISOString() })
        .eq('id', roomId);

    if (updateSeenError) {
        console.warn(`Could not update ${lastSeenUpdateField} for room ${roomId}:`, updateSeenError.message);
        // Non-critical, proceed with returning messages
    }


    return NextResponse.json({
      message: 'پیام‌ها با موفقیت دریافت شدند.',
      data: messages?.reverse() || [], // Reverse to show oldest first for client-side display
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: count, // Supabase returns total count if { count: 'exact' } is used in query
        totalPages: count ? Math.ceil(count / limit) : 0,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('GET Chat Messages API - Generic error:', error);
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


// POST: Send a new message in a specific chat room
export async function POST(request: NextRequest, { params }: RoomMessagesRouteParams) {
  const { roomId } = params;
  if (!roomId) {
    return NextResponse.json({ message: 'شناسه اتاق چت الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  let validatedMessageData: TChatMessageContentRequest;
  try {
    const body = await request.json();
    validatedMessageData = ChatMessageContentSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'محتوای پیام نامعتبر است.', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  try {
    // 1. Verify user is a participant of the room (RLS also enforces this on INSERT into chat_messages)
    const { data: roomData, error: roomError } = await supabase
      .from('chat_rooms')
      .select('id') // Just need to check existence and participation
      .eq('id', roomId)
      .or(`user_id.eq.${userProfile.id},chef_id.eq.${userProfile.id}`)
      .single(); // Expect one room

    if (roomError || !roomData) {
      return NextResponse.json({ message: 'اتاق چت یافت نشد یا شما اجازه ارسال پیام در این اتاق را ندارید.' }, { status: roomData ? 403 : 404 });
    }

    // 2. Insert the new message
    const { data: newMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,
        sender_id: userProfile.id,
        content: validatedMessageData.content,
      })
      .select(`
        *,
        profiles!chat_messages_sender_id_fkey (
          id,
          full_name,
          avatar_url,
          role
        )
      `)
      .single();

    if (insertError) {
      console.error('Error sending message:', insertError);
      return NextResponse.json({ message: 'خطا در ارسال پیام: ' + insertError.message }, { status: 500 });
    }

    // The trigger 'on_new_chat_message_update_room' should automatically update 'updated_at' in 'chat_rooms'.
    // Also, after sending a message, the sender has "seen" it.
    const lastSeenUpdateField = userProfile.id === (await supabase.from('chat_rooms').select('user_id').eq('id', roomId).single()).data?.user_id ? 'user_last_seen_at' : 'chef_last_seen_at';
    await supabase
        .from('chat_rooms')
        .update({ [lastSeenUpdateField]: new Date().toISOString() })
        .eq('id', roomId);


    // Realtime event for this new message will be picked up by clients subscribed to this room.

    // Create notification for the other participant in the room
    const { data: roomDetailsForNotification, error: roomDetailsError } = await supabase
        .from('chat_rooms')
        .select('user_id, chef_id, order_id')
        .eq('id', roomId)
        .single();

    if (roomDetailsError || !roomDetailsForNotification) {
        console.warn(`Could not fetch room details for notification on new message in room ${roomId}`);
    } else {
        const recipientId = roomDetailsForNotification.user_id === userProfile.id
            ? roomDetailsForNotification.chef_id
            : roomDetailsForNotification.user_id;

        if (recipientId) {
            const notificationPayload = {
                user_id: recipientId,
                type: 'new_chat_message',
                title: `پیام جدید از ${userProfile.fullName || 'کاربر'}`,
                message: `شما یک پیام جدید در گفتگوی مربوط به سفارش #${roomDetailsForNotification.order_id.substring(0,8)} دریافت کردید.`,
                link_to: `/dashboard/chat/${roomId}`,
                metadata: {
                    orderId: roomDetailsForNotification.order_id,
                    roomId: roomId,
                    senderId: userProfile.id,
                    senderName: userProfile.fullName,
                    messagePreview: validatedMessageData.content.substring(0, 50) // Preview of the message
                }
            };
            const { error: notificationError } = await supabase.from('notifications').insert(notificationPayload);
            if (notificationError) {
                console.error("Failed to create new_chat_message notification:", notificationError.message);
            }
        }
    }

    return NextResponse.json({
      message: 'پیام شما با موفقیت ارسال شد.',
      data: newMessage,
    }, { status: 201 });

  } catch (error) {
    console.error('POST Chat Message API - Generic error:', error);
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
