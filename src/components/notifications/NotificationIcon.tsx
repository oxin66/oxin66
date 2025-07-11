'use client';

import React from 'react';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { BellIcon } from '@heroicons/react/24/outline'; // Using Heroicons

interface NotificationIconProps {
  onClick?: () => void; // To toggle dropdown or navigate to notifications page
}

const NotificationIcon: React.FC<NotificationIconProps> = ({ onClick }) => {
  const { unreadCount } = useNotificationContext();

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-full text-gray-600 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
      aria-label="نوتیفیکیشن‌ها"
    >
      <BellIcon className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 block h-5 w-5 transform -translate-y-1/2 translate-x-1/2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
          <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 text-white text-xs items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount.toLocaleString('fa-IR')}
          </span>
        </span>
      )}
    </button>
  );
};

export default NotificationIcon;
