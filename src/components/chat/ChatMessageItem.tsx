import React from 'react';
import { UserProfile } from '@/lib/userUtils'; // Assuming this type is available and includes id, full_name, avatar_url

export interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles: Pick<UserProfile, 'id' | 'full_name' | 'avatar_url' | 'role'> | null; // Sender's profile
}

interface ChatMessageItemProps {
  message: ChatMessage;
  currentUserId: string;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, currentUserId }) => {
  const isCurrentUserSender = message.sender_id === currentUserId;
  const senderName = message.profiles?.full_name || 'کاربر ناشناس';
  // const senderAvatar = message.profiles?.avatar_url; // Could use an avatar component

  const formattedTime = new Date(message.created_at).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex mb-3 ${isCurrentUserSender ? 'justify-end' : 'justify-start'}`} dir="rtl">
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${
          isCurrentUserSender
            ? 'bg-blue-500 text-white rounded-br-none'
            : 'bg-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        {!isCurrentUserSender && (
          <p className="text-xs font-semibold mb-1 text-gray-600">{senderName}</p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${
            isCurrentUserSender ? 'text-blue-200 text-left' : 'text-gray-500 text-right'
          }`}
          dir="ltr" // Time is usually LTR
        >
          {formattedTime}
        </p>
      </div>
    </div>
  );
};

export default ChatMessageItem;
