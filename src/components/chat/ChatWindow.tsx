'use client';

import React, { useEffect, useState, useCallback, useRef, FormEvent } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js'; // Use SupabaseClient type
import { UserProfile } from '@/lib/userUtils';
import ChatMessageItem, { ChatMessage } from './ChatMessageItem'; // Assuming ChatMessage type is also exported
import { ChatMessageContentSchema } from '@/lib/validators/chat';
import { ZodError } from 'zod';

interface ChatWindowProps {
  roomId: string;
  currentUser: UserProfile; // Logged-in user's profile
  otherParticipantName?: string | null; // Name of the other person in chat
}

const ChatWindow: React.FC<ChatWindowProps> = ({ roomId, currentUser, otherParticipantName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 30 });
  const [hasMoreOldMessages, setHasMoreOldMessages] = useState(true);

  // Correctly type the supabase client from createClient function
  const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );


  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messagesContainerRef = useRef<null | HTMLDivElement>(null);


  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const fetchMessages = useCallback(async (page = 1, appending = false) => {
    if (!appending) setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages?page=${page}&limit=${pagination.pageSize}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در دریافت پیام‌ها');
      }
      const data = await response.json();
      const fetchedMessages = data.data as ChatMessage[];

      setMessages((prevMessages) =>
        appending ? [...fetchedMessages, ...prevMessages] : fetchedMessages
      );

      if (data.pagination) {
        setPagination(data.pagination);
        setHasMoreOldMessages(data.pagination.currentPage < data.pagination.totalPages);
      }
      if (!appending) {
        // Ensure scrolling to bottom only after initial load or when sending a new message, not when loading older messages
        setTimeout(() => scrollToBottom('auto'), 0);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(errorMessage);
    } finally {
      if (!appending) setIsLoading(false);
    }
  }, [roomId, pagination.pageSize]);

  useEffect(() => {
    fetchMessages(1); // Initial fetch for page 1

    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on<ChatMessage>( // Specify the type for the payload
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          console.log('Realtime: New chat message received!', payload);
          const newMsg = payload.new as ChatMessage;

          // Fetch sender profile if not already efficiently included.
          // For simplicity, assume newMsg might need its profile enriched.
          // A better way: API POST /messages returns message with profile,
          // and realtime just adds it if sender is not current user.
          if (newMsg.sender_id !== currentUser.id) { // Only add if it's not an echo of own message
            // Fetch profile for sender of new message if not included
            // This is a simplified approach. Ideally, the message object from Realtime already has profile.
            let msgWithProfile = { ...newMsg, profiles: null };
            if (!newMsg.profiles) {
                 const { data: senderProfile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, role')
                    .eq('id', newMsg.sender_id)
                    .single();
                if (profileError) console.error("Error fetching sender profile for RT message", profileError);
                else msgWithProfile.profiles = senderProfile;
            } else {
                msgWithProfile.profiles = newMsg.profiles;
            }


            setMessages((prevMessages) => {
              if (prevMessages.find(m => m.id === newMsg.id)) return prevMessages;
              return [...prevMessages, msgWithProfile];
            });
            // TODO: Update last_seen_at for this user since a new message arrived and they are viewing the room
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') console.log(`Subscribed to chat room ${roomId}`);
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`Subscription error for chat room ${roomId}:`, err);
            setError(`خطا در اتصال به چت زنده: ${err?.message || status}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase, currentUser.id]); // Removed fetchMessages from here to avoid re-subscribing on its change

  useEffect(() => {
    // Scroll to bottom when messages change, but only if we are already near the bottom
    // This prevents auto-scroll when user is viewing older messages.
    const container = messagesContainerRef.current;
    if (container) {
        const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 150; // 150px threshold
        if(isScrolledToBottom) {
            scrollToBottom();
        }
    }
  }, [messages]);


  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = newMessage.trim();
    if (!content) return;

    try {
      ChatMessageContentSchema.parse({ content });
    } catch (error) {
      if (error instanceof ZodError) {
        alert(error.errors[0].message); // Show first validation error
        return;
      }
    }

    setIsSending(true);
    const tempId = `temp-${Date.now()}`; // Optimistic update ID

    // Optimistic update: Add message to UI immediately
    const optimisticMessage: ChatMessage = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUser.id,
      content,
      created_at: new Date().toISOString(),
      profiles: { // Current user's profile
        id: currentUser.id,
        full_name: currentUser.fullName,
        avatar_url: currentUser.avatarUrl,
        role: currentUser.role,
      }
    };
    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    setNewMessage(''); // Clear input field

    try {
      const response = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'خطا در ارسال پیام');
      }

      // Replace optimistic message with actual message from server
      setMessages(prevMessages =>
        prevMessages.map(msg => msg.id === tempId ? (result.data as ChatMessage) : msg)
      );

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(`خطا در ارسال: ${errorMessage}`);
      // Revert optimistic update on error
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempId));
      setNewMessage(content); // Put message back in input
      alert(`خطا در ارسال: ${errorMessage}`);
    } finally {
      setIsSending(false);
      // Ensure scroll to bottom after sending a message
      setTimeout(() => scrollToBottom('smooth'), 0);
    }
  };

  const loadOlderMessages = () => {
    if (hasMoreOldMessages && !isLoading) {
        const currentHeight = messagesContainerRef.current?.scrollHeight || 0;
        fetchMessages(pagination.currentPage + 1, true).then(() => {
            // Try to maintain scroll position after loading older messages
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight - currentHeight;
            }
        });
    }
  };


  if (isLoading && messages.length === 0) { // Show loading only on initial full load
    return <div className="text-center py-10">در حال بارگذاری پیام‌ها...</div>;
  }

  if (error && messages.length === 0) { // Show error only if no messages could be loaded
    return <div className="text-center py-10 text-red-500">خطا: {error}</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[700px] bg-white shadow-lg rounded-lg overflow-hidden" dir="rtl">
      <header className="bg-gray-100 p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-800">چت با {otherParticipantName || 'طرف مقابل'}</h2>
      </header>

      <div ref={messagesContainerRef} className="flex-1 p-4 space-y-3 overflow-y-auto">
        {hasMoreOldMessages && (
            <div className="text-center mb-4">
                <button
                    onClick={loadOlderMessages}
                    disabled={isLoading}
                    className="text-sm text-blue-500 hover:underline disabled:text-gray-400"
                >
                    {isLoading ? 'در حال بارگذاری...' : 'بارگذاری پیام‌های قدیمی‌تر'}
                </button>
            </div>
        )}
        {messages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} currentUserId={currentUser.id} />
        ))}
        <div ref={messagesEndRef} /> {/* For auto-scrolling */}
      </div>
      {error && <p className="text-xs text-red-500 px-4 pb-2 text-center">{error}</p>}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-gray-50">
        <div className="flex items-center space-x-2 space-x-reverse">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="پیام خود را بنویسید..."
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-400"
          >
            {isSending ? 'در حال ارسال...' : 'ارسال'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
