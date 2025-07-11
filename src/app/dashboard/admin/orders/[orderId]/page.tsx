'use client'; // For form handling, state, and client-side data fetching/mutation

import React, { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
// Assuming types from other modules are available or can be defined here
// For example: OrderForAdminList, UserProfile, BidItem, ReviewItemData, TransactionItem etc.
// For simplicity, using a generic 'any' for complex nested data for now.
// In a real app, these types should be well-defined.

interface OrderDetailAdminView {
  id: string;
  status: string;
  budget: number;
  final_bid_amount?: number | null;
  created_at: string;
  updated_at: string;
  userProfile?: any | null; // Should be UserProfile type
  chefProfile?: any | null; // Should be UserProfile type for chef
  bids?: any[] | null;      // Array of BidItem
  reviews?: any | null;     // ReviewItemData (single review per order)
  transactions?: any[] | null; // Array of Transaction items
  description?: string | null;
  cuisine_type?: string | null;
  number_of_people?: number;
  dietary_restrictions?: string[] | null;
  delivery_location?: any | null;
  // ... other fields from your GET /api/admin/orders/[orderId] response
}

async function fetchOrderDetailsForAdmin(orderId: string): Promise<OrderDetailAdminView | null> {
  try {
    const response = await fetch(`/api/admin/orders/${orderId}`);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'خطا در دریافت جزئیات سفارش');
    }
    const data = await response.json();
    return data.data as OrderDetailAdminView;
  } catch (error) {
    console.error("Failed to fetch order details for admin:", error);
    return null;
  }
}

export default function AdminOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderDetailAdminView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState('');
  const [adminReason, setAdminReason] = useState('');

  useEffect(() => {
    if (orderId) {
      setIsLoading(true);
      fetchOrderDetailsForAdmin(orderId)
        .then(orderData => {
          if (orderData) {
            setOrder(orderData);
            setNewStatus(orderData.status); // Initialize select with current status
          } else {
            setError('سفارش یافت نشد.');
          }
        })
        .catch(err => setError((err as Error).message))
        .finally(() => setIsLoading(false));
    }
  }, [orderId]);

  const handleStatusUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!order || !newStatus || newStatus === order.status) {
        setError("لطفاً یک وضعیت جدید انتخاب کنید یا وضعیت انتخابی با وضعیت فعلی یکسان است.");
        return;
    }
    setIsUpdatingStatus(true);
    setError(null);
    setSuccessMessage(null);

    try {
        const response = await fetch(`/api/admin/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, admin_reason: adminReason }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'خطا در به‌روزرسانی وضعیت سفارش.');
        }
        setSuccessMessage(`وضعیت سفارش با موفقیت به '${newStatus}' تغییر یافت.`);
        setOrder(result.data); // Update local order state with response
        setAdminReason(''); // Clear reason
    } catch (err) {
        setError((err as Error).message);
    } finally {
        setIsUpdatingStatus(false);
    }
  };


  if (isLoading) return <div className="text-center py-10">در حال بارگذاری جزئیات سفارش...</div>;
  if (error && !order) return <div className="text-center py-10 text-red-500">خطا: {error}</div>;
  if (!order) return <div className="text-center py-10">سفارش یافت نشد.</div>;

  // Example statuses - should match API and DB schema
  const allOrderStatuses = [
    'pending_bids', 'chef_selected', 'awaiting_payment', 'payment_completed',
    'in_preparation', 'ready_for_delivery', 'out_for_delivery', 'delivered',
    'completed', 'cancelled_by_user', 'cancelled_by_chef', 'cancelled_by_admin', 'disputed'
  ];

  return (
    <div dir="rtl">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">جزئیات سفارش #{order.id.substring(0, 8)}...</h1>
          <p className="text-sm text-gray-500">
            تاریخ ثبت: {new Date(order.created_at).toLocaleString('fa-IR')}
          </p>
        </div>
        <Link href="/dashboard/admin/orders" className="text-sm text-blue-600 hover:underline">
            &larr; بازگشت به لیست سفارشات
        </Link>
      </header>

      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded-md mb-4 text-sm" role="alert">
          {successMessage}
        </div>
      )}
       {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md mb-4 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Order Info Section */}
      <div className="bg-white p-6 shadow-md rounded-lg mb-6">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">اطلاعات کلی</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><strong>شناسه سفارش:</strong> {order.id}</p>
            <p><strong>وضعیت فعلی:</strong> <span className="font-semibold">{order.status}</span></p>
            <p><strong>کاربر:</strong> {order.userProfile?.full_name || order.user_id} ({order.userProfile?.email})</p>
            <p><strong>آشپز:</strong> {order.chefProfile?.full_name || (order.assigned_chef_id ? 'یافت نشد' : 'هنوز انتخاب نشده')} {order.chefProfile?.email ? `(${order.chefProfile.email})` : ''}</p>
            <p><strong>بودجه اولیه:</strong> {order.budget?.toLocaleString('fa-IR')} تومان</p>
            <p><strong>مبلغ نهایی (پس از پیشنهاد):</strong> {order.final_bid_amount?.toLocaleString('fa-IR') || 'نامشخص'} تومان</p>
            <p><strong>تعداد نفرات:</strong> {order.number_of_people || 'نامشخص'}</p>
            <p><strong>نوع غذا:</strong> {order.cuisine_type || 'نامشخص'}</p>
            <p><strong>محدودیت غذایی:</strong> {(order.dietary_restrictions || []).join(', ') || 'ندارد'}</p>
            <p><strong>توضیحات کاربر:</strong> {order.description || 'ندارد'}</p>
            <p><strong>زمان تحویل مدنظر:</strong> {order.preferred_delivery_time ? new Date(order.preferred_delivery_time).toLocaleString('fa-IR') : 'نامشخص'}</p>
            <p><strong>آخرین به‌روزرسانی:</strong> {new Date(order.updated_at).toLocaleString('fa-IR')}</p>
        </div>
      </div>

      {/* Admin: Change Order Status */}
      <div className="bg-white p-6 shadow-md rounded-lg mb-6">
        <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">تغییر وضعیت سفارش (توسط ادمین)</h2>
        <form onSubmit={handleStatusUpdate} className="space-y-3">
          <div>
            <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700">وضعیت جدید:</label>
            <select
              id="newStatus"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {allOrderStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="adminReason" className="block text-sm font-medium text-gray-700">دلیل تغییر (اختیاری):</label>
            <textarea
              id="adminReason"
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              rows={2}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="مثلاً: لغو به دلیل عدم پاسخگویی آشپز"
            />
          </div>
          <button
            type="submit"
            disabled={isUpdatingStatus || newStatus === order.status}
            className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-md hover:bg-orange-600 disabled:bg-gray-400"
          >
            {isUpdatingStatus ? 'در حال به‌روزرسانی...' : 'اعمال تغییر وضعیت'}
          </button>
        </form>
      </div>

      {/* Display Bids (if any) */}
      {order.bids && order.bids.length > 0 && (
        <div className="bg-white p-6 shadow-md rounded-lg mb-6">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">پیشنهادات ثبت شده ({order.bids.length})</h2>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {order.bids.map((bid: any) => (
              <div key={bid.id} className="p-3 border rounded-md bg-gray-50 text-xs">
                <p><strong>آشپز:</strong> {bid.bidderProfile?.full_name || bid.chef_id}</p>
                <p><strong>مبلغ:</strong> {bid.bid_amount?.toLocaleString('fa-IR')} تومان</p>
                <p><strong>وضعیت پیشنهاد:</strong> {bid.status}</p>
                <p><strong>یادداشت آشپز:</strong> {bid.chef_notes || '-'}</p>
                <p><strong>زمان ثبت:</strong> {new Date(bid.created_at).toLocaleString('fa-IR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Display Review (if any) */}
      {order.reviews && (
         <div className="bg-white p-6 shadow-md rounded-lg mb-6">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">بازخورد ثبت شده</h2>
             <div className="p-3 border rounded-md bg-gray-50 text-xs">
                <p><strong>کاربر:</strong> {order.reviews.reviewerProfile?.full_name || order.reviews.user_id}</p>
                <p><strong>امتیاز:</strong> {order.reviews.rating} ستاره</p>
                <p><strong>نظر:</strong> {order.reviews.comment || '-'}</p>
                <p><strong>زمان ثبت:</strong> {new Date(order.reviews.created_at).toLocaleString('fa-IR')}</p>
             </div>
         </div>
      )}

      {/* Display Transactions (if any) */}
      {order.transactions && order.transactions.length > 0 && (
        <div className="bg-white p-6 shadow-md rounded-lg">
          <h2 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">تاریخچه تراکنش‌ها ({order.transactions.length})</h2>
           <div className="space-y-3 max-h-60 overflow-y-auto">
            {order.transactions.map((tx: any) => (
              <div key={tx.id} className="p-3 border rounded-md bg-gray-50 text-xs">
                <p><strong>شناسه تراکنش:</strong> {tx.id.substring(0,10)}...</p>
                <p><strong>مبلغ:</strong> {tx.amount?.toLocaleString('fa-IR')} تومان</p>
                <p><strong>وضعیت:</strong> {tx.status}</p>
                <p><strong>Authority:</strong> {tx.authority}</p>
                <p><strong>RefID:</strong> {tx.ref_id || '-'}</p>
                <p><strong>زمان ایجاد:</strong> {new Date(tx.created_at).toLocaleString('fa-IR')}</p>
                {tx.verified_at && <p><strong>زمان تأیید:</strong> {new Date(tx.verified_at).toLocaleString('fa-IR')}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
