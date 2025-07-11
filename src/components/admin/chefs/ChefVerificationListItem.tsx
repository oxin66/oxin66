'use client'; // Needed for state and event handlers (e.g., for select dropdown)

import React, { useState } from 'react';
import { UserProfile } from '@/lib/userUtils'; // Assuming UserProfile includes verification_status

export interface ChefProfileAdminView extends UserProfile {
  email?: string; // Ensure email is part of the profile data fetched for admin
  phone_number?: string | null;
  verification_status: 'pending_review' | 'approved' | 'rejected' | 'needs_more_info' | string; // string for flexibility if more statuses
  // admin_notes?: string | null; // If you implement admin notes
}

interface ChefVerificationListItemProps {
  chef: ChefProfileAdminView;
  onUpdateStatus: (chefId: string, newStatus: string, adminNotes?: string) => Promise<boolean>; // Returns true on success
}

const ChefVerificationListItem: React.FC<ChefVerificationListItemProps> = ({ chef, onUpdateStatus }) => {
  const [currentStatus, setCurrentStatus] = useState(chef.verification_status);
  const [adminNotes, setAdminNotes] = useState(''); // For potential admin notes input
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const possibleStatuses = [
    { value: 'pending_review', label: 'در انتظار بررسی' },
    { value: 'approved', label: 'تأیید شده' },
    { value: 'rejected', label: 'رد شده' },
    { value: 'needs_more_info', label: 'نیاز به اطلاعات بیشتر' },
  ];

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    setError(null);
    const success = await onUpdateStatus(chef.id, newStatus, adminNotes || undefined);
    if (success) {
      setCurrentStatus(newStatus);
      // alert(`وضعیت آشپز ${chef.full_name} به ${possibleStatuses.find(s=>s.value === newStatus)?.label} تغییر یافت.`);
      setAdminNotes(''); // Clear notes after successful update
    } else {
      setError('خطا در به‌روزرسانی وضعیت. لطفاً دوباره تلاش کنید.');
      // Revert UI change if needed, though parent list might refetch
    }
    setIsUpdating(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-500';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-500';
      case 'pending_review': return 'bg-yellow-100 text-yellow-700 border-yellow-500';
      case 'needs_more_info': return 'bg-blue-100 text-blue-700 border-blue-500';
      default: return 'bg-gray-100 text-gray-700 border-gray-500';
    }
  };


  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-3 border-l-4 transition-all hover:shadow-md" style={{borderColor: getStatusColor(currentStatus).split(' ')[2].replace('border-','')}}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        {/* Chef Info */}
        <div className="md:col-span-1">
          <p className="font-semibold text-gray-800">{chef.full_name || 'نامشخص'}</p>
          <p className="text-xs text-gray-500">{chef.email || 'ایمیل نامشخص'}</p>
          <p className="text-xs text-gray-500 mt-1">شناسه: {chef.id.substring(0, 8)}...</p>
        </div>

        {/* Current Status Display */}
        <div className="md:col-span-1">
           <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(currentStatus)}`}>
            {possibleStatuses.find(s => s.value === currentStatus)?.label || currentStatus}
          </span>
          <p className="text-xs text-gray-400 mt-1">
            عضویت: {new Date(chef.created_at).toLocaleDateString('fa-IR')}
          </p>
        </div>

        {/* Admin Notes (Optional) - Uncomment and style if you add admin_notes column */}
        {/* <div className="md:col-span-1">
            <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="یادداشت ادمین (اختیاری)"
                rows={2}
                className="w-full text-xs p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isUpdating}
            />
        </div> */}

        {/* Actions: Change Status */}
        <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse">
          <select
            value={currentStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdating}
            className="w-full sm:w-auto text-sm p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50"
          >
            {possibleStatuses.map(statusOption => (
              <option key={statusOption.value} value={statusOption.value}>
                {statusOption.label}
              </option>
            ))}
          </select>
          {/*
            // Alternative: Individual buttons for each action
            {currentStatus !== 'approved' && (
            <button
                onClick={() => handleStatusChange('approved')}
                disabled={isUpdating}
                className="w-full sm:w-auto text-xs bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-md transition-colors disabled:bg-gray-300"
            >
                {isUpdating && currentStatus === 'approved' ? '...' : 'تأیید'}
            </button>
            )}
            // ... other buttons for reject, needs_more_info
          */}
          {isUpdating && <div className="w-5 h-5 border-t-2 border-blue-500 rounded-full animate-spin"></div>}
        </div>
      </div>
      {error && <p className="text-red-500 text-xs mt-2 text-right">{error}</p>}
    </div>
  );
};

export default ChefVerificationListItem;
