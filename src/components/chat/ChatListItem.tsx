import React from 'react';
import Link from 'next/link';

export interface ChatRoomListItemData {
  id: string; // room_id
  order_id: string;
  otherParticipant: {
    id?: string;
    full_name?: string | null;
    avatar_url?: string | null;
    role?: string | null;
  };
  lastMessage: {
    content?: string | null;
    created_at?: string | null;
    isOwnMessage?: boolean;
  } | null;
  unreadMessagesCount: number;
  updated_at: string; // Room's last activity timestamp
  orders?: { status: string }; // Optional order status
}

interface ChatListItemProps {
  chatRoom: ChatRoomListItemData;
  currentUserId: string;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chatRoom, currentUserId }) => {
  const lastMessageText = chatRoom.lastMessage?.content
    ? (chatRoom.lastMessage.isOwnMessage ? "شما: " : "") +
      (chatRoom.lastMessage.content.length > 40 ? chatRoom.lastMessage.content.substring(0, 40) + "..." : chatRoom.lastMessage.content)
    : "هنوز پیامی ارسال نشده است.";

  const lastMessageTime = chatRoom.lastMessage?.created_at
    ? new Date(chatRoom.lastMessage.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    : new Date(chatRoom.updated_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const otherParticipantName = chatRoom.otherParticipant?.full_name || 'طرف مقابل';
  const linkHref = `/dashboard/chat/${chatRoom.id}`;

  return (
    <Link href={linkHref} legacyBehavior>
      <a className="block p-4 hover:bg-gray-50 border-b border-gray-200 transition-colors duration-150" dir="rtl">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="flex-shrink-0">
            {/* Placeholder for avatar, replace with actual avatar component if available */}
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
              {chatRoom.otherParticipant?.avatar_url ? (
                <img src={chatRoom.otherParticipant.avatar_url} alt={otherParticipantName} className="w-full h-full rounded-full object-cover" />
              ) : (
                otherParticipantName.substring(0, 1)
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <p className="text-md font-semibold text-gray-800 truncate">
                {otherParticipantName}
                <span className="text-xs text-gray-500 ml-1">({chatRoom.otherParticipant?.role === 'chef' ? 'آشپز' : 'کاربر'})</span>
              </p>
              <p className="text-xs text-gray-500">{lastMessageTime}</p>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-gray-600 truncate">
                {lastMessageText}
              </p>
              {chatRoom.unreadMessagesCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {chatRoom.unreadMessagesCount.toLocaleString('fa-IR')}
                </span>
              )}
            </div>
             {chatRoom.orders && <p className="text-xs text-gray-400 mt-1">وضعیت سفارش: {chatRoom.orders.status}</p>}
          </div>
        </div>
      </a>
    </Link>
  );
};

export default ChatListItem;
