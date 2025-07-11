'use client';

import React from 'react';
import { UserProfile } from '@/lib/userUtils'; // UserProfile should include role, account_status, verification_status etc.
import Link from 'next/link';

// Define a more specific type for the user data displayed in the admin list
export interface UserForAdminList extends UserProfile {
  email?: string; // Ensure email is part of the data fetched by admin API
  // other fields like last_sign_in_at could be added if fetched by API
}

interface UserManagementListItemProps {
  user: UserForAdminList;
  // onUpdateUser: (userId: string, updates: Partial<UserForAdminList>) => Promise<boolean>; // For quick actions directly from list item
}

const UserManagementListItem: React.FC<UserManagementListItemProps> = ({ user }) => {

  const getRoleDisplay = (role: string | null | undefined) => {
    if (role === 'admin') return <span className="font-semibold text-purple-600">ادمین</span>;
    if (role === 'chef') return <span className="font-semibold text-orange-600">آشپز</span>;
    if (role === 'user') return <span className="font-semibold text-blue-600">کاربر عادی</span>;
    return <span className="text-gray-500">نامشخص</span>;
  };

  const getAccountStatusDisplay = (status: string | null | undefined) => {
    if (status === 'active') return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">فعال</span>;
    if (status === 'suspended') return <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">معلق</span>;
    if (status === 'banned_by_admin') return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">مسدود</span>;
    return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">{status || 'نامشخص'}</span>;
  };

  const getVerificationStatusDisplay = (status: string | null | undefined) => {
    if (!status || user.role !== 'chef') return null; // Only show for chefs
    if (status === 'approved') return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">تأیید شده</span>;
    if (status === 'pending_review') return <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">درانتظار بررسی</span>;
    if (status === 'rejected') return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">رد شده</span>;
    return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">{status}</span>;
  };


  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-3 border transition-all hover:shadow-md" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-center">

        {/* User Info */}
        <div className="lg:col-span-2">
          <div className="flex items-center space-x-3 space-x-reverse">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName || 'avatar'} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
                {user.fullName?.substring(0, 1) || '?'}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-800 truncate" title={user.fullName || undefined}>{user.fullName || 'نامشخص'}</p>
              <p className="text-xs text-gray-500 truncate" title={user.email || undefined}>{user.email || 'ایمیل نامشخص'}</p>
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="text-sm">
          <span className="text-gray-500">نقش: </span>{getRoleDisplay(user.role)}
        </div>

        {/* Statuses */}
        <div className="text-sm space-y-1">
          <div>
            <span className="text-gray-500">وضعیت حساب: </span>{getAccountStatusDisplay(user.account_status)}
          </div>
          {user.role === 'chef' && user.verification_status && (
            <div>
              <span className="text-gray-500">وضعیت تأیید: </span>{getVerificationStatusDisplay(user.verification_status)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="lg:col-span-1 flex justify-start sm:justify-end">
          {/* Link to a detailed edit page (to be created) */}
          <Link href={`/dashboard/admin/users/${user.id}`} legacyBehavior>
            <a className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-3 rounded-md transition-colors">
              مشاهده/ویرایش
            </a>
          </Link>
          {/* Quick actions like suspend/activate could be here with onUpdateUser callback */}
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-2 border-t pt-2">
        <p>شناسه: {user.id}</p>
        <p>تاریخ عضویت: {new Date(user.created_at || Date.now()).toLocaleDateString('fa-IR')}</p>
      </div>
    </div>
  );
};

export default UserManagementListItem;
