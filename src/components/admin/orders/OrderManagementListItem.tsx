'use client';

import React from 'react';
import Link from 'next/link';

// Define a type for the order data displayed in the admin list
// This should align with data returned by GET /api/admin/orders
export interface OrderForAdminList {
  id: string;
  user_id: string;
  userProfile?: { full_name?: string | null; email?: string | null } | null;
  assigned_chef_id?: string | null;
  chefProfile?: { full_name?: string | null; email?: string | null } | null;
  status: string;
  budget: number;
  final_bid_amount?: number | null;
  created_at: string;
  updated_at: string;
  // Add other relevant fields if needed
}

interface OrderManagementListItemProps {
  order: OrderForAdminList;
}

const OrderManagementListItem: React.FC<OrderManagementListItemProps> = ({ order }) => {

  const getStatusDisplay = (status: string) => {
    // This can be expanded with more specific colors/text for each status
    let colorClass = 'bg-gray-100 text-gray-700';
    let statusText = status;

    switch (status) {
      case 'pending_bids': colorClass = 'bg-yellow-100 text-yellow-700'; statusText = 'در انتظار پیشنهاد'; break;
      case 'chef_selected': colorClass = 'bg-blue-100 text-blue-700'; statusText = 'آشپز انتخاب شد'; break;
      case 'awaiting_payment': colorClass = 'bg-cyan-100 text-cyan-700'; statusText = 'در انتظار پرداخت'; break;
      case 'payment_completed': colorClass = 'bg-teal-100 text-teal-700'; statusText = 'پرداخت تکمیل شد'; break;
      case 'in_preparation': colorClass = 'bg-indigo-100 text-indigo-700'; statusText = 'در حال آماده‌سازی'; break;
      case 'ready_for_delivery': colorClass = 'bg-purple-100 text-purple-700'; statusText = 'آماده تحویل'; break;
      case 'out_for_delivery': colorClass = 'bg-pink-100 text-pink-700'; statusText = 'ارسال شده'; break;
      case 'delivered': colorClass = 'bg-lime-100 text-lime-700'; statusText = 'تحویل داده شد'; break;
      case 'completed': colorClass = 'bg-green-100 text-green-700'; statusText = 'تکمیل شده'; break;
      case 'cancelled_by_user':
      case 'cancelled_by_chef':
      case 'cancelled_by_admin':
        colorClass = 'bg-red-100 text-red-700';
        statusText = status === 'cancelled_by_user' ? 'لغو توسط کاربر' : status === 'cancelled_by_chef' ? 'لغو توسط آشپز' : 'لغو توسط ادمین';
        break;
      case 'disputed': colorClass = 'bg-orange-100 text-orange-700'; statusText = 'مورد اختلاف'; break;
      default: statusText = status;
    }
    return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>{statusText}</span>;
  };

  const displayAmount = order.final_bid_amount || order.budget;

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-3 border transition-all hover:shadow-md" dir="rtl">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-center">

        {/* Order ID & Date */}
        <div>
          <p className="font-semibold text-gray-800 truncate" title={order.id}>سفارش #{order.id.substring(0, 8)}...</p>
          <p className="text-xs text-gray-500">
            ثبت: {new Date(order.created_at).toLocaleDateString('fa-IR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
          </p>
        </div>

        {/* User Info */}
        <div className="text-sm">
          <span className="text-gray-500">کاربر: </span>
          <span className="font-medium text-gray-700 truncate" title={order.userProfile?.email || undefined}>
            {order.userProfile?.full_name || order.user_id.substring(0,8) + '...'}
          </span>
        </div>

        {/* Chef Info */}
        <div className="text-sm">
          <span className="text-gray-500">آشپز: </span>
          {order.chefProfile?.full_name ? (
            <span className="font-medium text-gray-700 truncate" title={order.chefProfile?.email || undefined}>
              {order.chefProfile.full_name}
            </span>
          ) : (
            <span className="text-gray-400 italic">مشخص نشده</span>
          )}
        </div>

        {/* Status & Amount */}
        <div className="text-sm space-y-1">
            <div>{getStatusDisplay(order.status)}</div>
            <div className="text-xs text-gray-600">
                مبلغ: {displayAmount.toLocaleString('fa-IR')} تومان
            </div>
        </div>

        {/* Actions */}
        <div className="lg:col-span-1 flex justify-start sm:justify-end">
          <Link href={`/dashboard/admin/orders/${order.id}`} legacyBehavior>
            <a className="text-xs bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-3 rounded-md transition-colors">
              مشاهده جزئیات
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderManagementListItem;
