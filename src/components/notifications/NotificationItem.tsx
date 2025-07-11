'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // For programmatic navigation if link_to is not a simple URL
import { useNotificationContext } from '@/contexts/NotificationContext';

// Assuming Notification type is defined and exported from NotificationContext
import type { Notification } from '@/contexts/NotificationContext';

interface NotificationItemProps {
  notification: Notification;
  onCloseDropdown?: () => void; // To close dropdown after clicking a notification
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onCloseDropdown }) => {
  const { markAsRead } = useNotificationContext();
  const router = useRouter();

  const formattedTime = new Date(notification.created_at).toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });
   const formattedDate = new Date(notification.created_at).toLocaleDateString('fa-IR', {
    day: 'numeric',
    month: 'short',
  });


  const handleNotificationClick = async () => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (onCloseDropdown) {
      onCloseDropdown();
    }
    if (notification.link_to) {
      router.push(notification.link_to);
    }
    // If no link_to, clicking just marks as read and closes dropdown.
  };

  // Determine icon based on type - can be expanded
  let typeIcon = "🔔"; // Default
  if (notification.type === 'new_bid') typeIcon = "💰";
  else if (notification.type === 'bid_accepted') typeIcon = "✅";
  else if (notification.type === 'bid_rejected') typeIcon = "❌";
  else if (notification.type === 'new_chat_message') typeIcon = "💬";
  else if (notification.type === 'order_status_changed') typeIcon = "🔄";
  else if (notification.type === 'chef_verification_update') typeIcon = "🧑‍🍳";
  else if (notification.type === 'new_review') typeIcon = "⭐";


  return (
    <div
      onClick={handleNotificationClick}
      className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 cursor-pointer ${
        notification.is_read ? 'opacity-70' : 'bg-blue-50 dark:bg-blue-900/30 font-medium'
      }`}
      dir="rtl"
    >
      <div className="flex items-start space-x-3 space-x-reverse">
        <div className="text-xl">{typeIcon}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${notification.is_read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-semibold'}`}>
            {notification.title}
          </p>
          <p className={`text-xs mt-1 ${notification.is_read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            {formattedDate} - {formattedTime}
          </p>
        </div>
        {!notification.is_read && (
          <div className="flex-shrink-0 mt-1">
            <span className="block h-2.5 w-2.5 bg-blue-500 rounded-full" title="خوانده نشده"></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;
