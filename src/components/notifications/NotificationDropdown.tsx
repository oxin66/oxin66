'use client';

import React from 'react';
import { useNotificationContext } from '@/contexts/NotificationContext';
import NotificationItem from './NotificationItem';
import Link from 'next/link';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, isLoading, markAllAsRead, fetchNotifications } = useNotificationContext();

  if (!isOpen) return null;

  const handleMarkAllReadAndClose = async () => {
    await markAllAsRead();
    // Optionally, refetch to ensure list consistency if optimistic update is not enough
    // fetchNotifications();
    // onClose(); // Keep open to see them marked as read, or close. User preference.
  };

  return (
    <div
      className="absolute rtl:left-0 ltr:right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-50"
      dir="rtl"
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside dropdown
    >
      <div className="flex justify-between items-center p-3 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <h3 className="text-md font-semibold text-gray-800 dark:text-white">نوتیفیکیشن‌ها</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
        </button>
      </div>

      {isLoading && notifications.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-500">در حال بارگذاری...</div>
      ) : notifications.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-500">نوتیفیکیشن جدیدی وجود ندارد.</div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {notifications.map((notif) => (
            <NotificationItem key={notif.id} notification={notif} onCloseDropdown={onClose} />
          ))}
        </div>
      )}

      <div className="p-2 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 z-10">
        <div className="flex justify-between items-center text-xs">
            {unreadCount > 0 && (
                 <button
                    onClick={handleMarkAllReadAndClose}
                    className="text-blue-600 hover:underline dark:text-blue-400 px-2 py-1"
                >
                    علامت‌گذاری همه به عنوان خوانده شده ({unreadCount.toLocaleString('fa-IR')})
                </button>
            )}
           <span className="flex-grow"></span> {/* Spacer */}
          <Link href="/dashboard/notifications" legacyBehavior>
            <a onClick={onClose} className="text-blue-600 hover:underline dark:text-blue-400 px-2 py-1">
              مشاهده همه نوتیفیکیشن‌ها
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;
