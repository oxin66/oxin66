'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js'; // Use SupabaseClient type
import { UserProfile } from '@/lib/userUtils';
import ChatListItem, { ChatRoomListItemData } from './ChatListItem';
import Link from 'next/link';

interface ChatListProps {
  currentUser: UserProfile;
}

const ChatList: React.FC<ChatListProps> = ({ currentUser }) => {
  const [chatRooms, setChatRooms] = useState<ChatRoomListItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchChatRooms = useCallback(async () => {
    // setIsLoading(true); // Handled initially
    // setError(null); // Keep error until successful fetch
    try {
      const response = await fetch('/api/chat/rooms');
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در دریافت لیست گفتگوها');
      }
      const data = await response.json();
      setChatRooms(data.data || []);
      setError(null); // Clear error on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChatRooms(); // Initial fetch

    // Subscribe to changes in chat_rooms relevant to the current user
    const roomsChannel = supabase
      .channel(`user-chat-rooms-list-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT, UPDATE
          schema: 'public',
          table: 'chat_rooms',
          // This filter needs to be based on user_id OR chef_id being the current user.
          // RLS on the server-side API for fetching rooms already handles security.
          // For realtime, if direct table listening, the filter can be complex.
          // A simpler realtime trigger might be on a 'user_notifications' table if that pattern is used.
          // For now, we'll refetch if ANY relevant room updates or a new one is inserted.
          // A more precise filter would be: `or=(user_id.eq.${currentUser.id},chef_id.eq.${currentUser.id})`
          // This filter syntax might need verification for Supabase realtime.
          // Let's assume for now that any relevant update to chat_rooms table will trigger a refetch.
        },
        (payload) => {
          console.log('Realtime: Chat room list may need update due to room change', payload);
          // Check if the changed room involves the current user before refetching
          const changedRoom = payload.new as any; // Type it properly if possible
          if (changedRoom && (changedRoom.user_id === currentUser.id || changedRoom.chef_id === currentUser.id)) {
            fetchChatRooms(); // Refetch the whole list
          } else if (payload.eventType === 'INSERT' && (payload.new as any).user_id === currentUser.id || (payload.new as any).chef_id === currentUser.id) {
             fetchChatRooms(); // New room involving current user
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') console.log(`Subscribed to chat room list updates for user ${currentUser.id}`);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`Subscription error for chat room list:`, err);
            // setError(`خطا در اتصال به به‌روزرسانی‌های زنده لیست گفتگوها: ${err?.message || status}`);
        }
      });

      // Also, listen to new messages in ANY of the user's rooms to update last message/unread count
      // This is more complex as it means subscribing to potentially many message channels or a generic one.
      // The API for fetching rooms already calculates unread counts.
      // A simpler approach for realtime on list: only re-fetch list when a room's `updated_at` changes.
      // The trigger `on_new_chat_message_update_room` handles updating `chat_rooms.updated_at`.

    return () => {
      supabase.removeChannel(roomsChannel);
    };
  }, [currentUser.id, supabase, fetchChatRooms]);

  if (isLoading) {
    return <div className="text-center py-10">در حال بارگذاری لیست گفتگوها...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-center" role="alert">
        <p className="font-bold">خطا</p>
        <p>{error}</p>
        <button onClick={fetchChatRooms} className="mt-2 bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded">تلاش مجدد</button>
      </div>
    );
  }

  if (chatRooms.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg p-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <p className="mt-3 text-gray-600">شما هنوز هیچ گفتگوی فعالی ندارید.</p>
        {currentUser.role === 'user' && (
            <p className="text-sm text-gray-500 mt-1">پس از اینکه آشپزی پیشنهاد شما را پذیرفت، می‌توانید از اینجا با او گفتگو کنید.</p>
        )}
        {currentUser.role === 'chef' && (
            <p className="text-sm text-gray-500 mt-1">پس از اینکه پیشنهاد شما توسط کاربر پذیرفته شد، می‌توانید از اینجا با او گفتگو کنید.</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-800">لیست گفتگوها</h2>
      </div>
      <div className="divide-y divide-gray-200 max-h-[calc(100vh-250px)] overflow-y-auto">
        {chatRooms.map((room) => (
          <ChatListItem key={room.id} chatRoom={room} currentUserId={currentUser.id} />
        ))}
      </div>
    </div>
  );
};

export default ChatList;
