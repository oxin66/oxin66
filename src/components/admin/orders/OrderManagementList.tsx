'use client';

import React, { useEffect, useState, useCallback } from 'react';
import OrderManagementListItem, { OrderForAdminList } from './OrderManagementListItem';

interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const OrderManagementList: React.FC = () => {
  const [orders, setOrders] = useState<OrderForAdminList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    pageSize: 15,
    totalItems: 0,
    totalPages: 1,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTermDebounced, setSearchTermDebounced] = useState('');

  // Debounce search query
  useEffect(() => {
    const timerId = setTimeout(() => {
      setSearchTermDebounced(searchQuery);
    }, 500); // 500ms delay
    return () => clearTimeout(timerId);
  }, [searchQuery]);

  const fetchOrders = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.pageSize),
      });
      if (statusFilter) params.append('status', statusFilter);
      if (searchTermDebounced) params.append('q', searchTermDebounced);

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در دریافت لیست سفارشات');
      }
      const data = await response.json();
      setOrders(data.data || []);
      setPagination(data.pagination || { currentPage: 1, pageSize: pagination.pageSize, totalItems: 0, totalPages: 1 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(errorMessage);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, statusFilter, searchTermDebounced]);

  useEffect(() => {
    setPagination(prev => ({...prev, currentPage: 1})); // Reset to page 1 on filter/search change
    fetchOrders(1);
  }, [statusFilter, searchTermDebounced, fetchOrders]);


  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
        fetchOrders(newPage);
    }
  };

  // Example statuses - this should ideally come from a shared constants file or be more dynamic
  const orderStatusesForFilter = [
    { value: '', label: 'همه وضعیت‌ها' },
    'pending_bids', 'chef_selected', 'awaiting_payment', 'payment_completed',
    'in_preparation', 'ready_for_delivery', 'out_for_delivery', 'delivered',
    'completed', 'cancelled_by_user', 'cancelled_by_chef', 'cancelled_by_admin', 'disputed'
  ].map(s => typeof s === 'string' ? ({ value: s, label: s }) : s); // Convert strings to objects if needed for display


  if (isLoading && orders.length === 0) {
    return (
        <div className="text-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">در حال بارگذاری لیست سفارشات...</p>
        </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label htmlFor="searchOrderQuery" className="block text-sm font-medium text-gray-700 mb-1">جستجو (شناسه، نام/ایمیل کاربر/آشپز):</label>
          <input
            type="text"
            id="searchOrderQuery"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو..."
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="orderStatusFilter" className="block text-sm font-medium text-gray-700 mb-1">وضعیت سفارش:</label>
          <select id="orderStatusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white">
            {orderStatusesForFilter.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-center" role="alert">
          <p className="font-bold">خطا</p>
          <p>{error}</p>
        </div>
      )}
      {isLoading && <p className="text-center text-gray-500 py-4">در حال به‌روزرسانی لیست سفارشات...</p>}

      {!isLoading && orders.length === 0 && (
        <div className="text-center py-10 bg-white rounded-lg shadow p-6">
           <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
             <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
           </svg>
          <p className="mt-3 text-gray-600">هیچ سفارشی با فیلترهای انتخاب شده یافت نشد.</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => (
          <OrderManagementListItem key={order.id} order={order} />
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 space-x-reverse mt-8 pb-4" dir="rtl">
          <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1 || isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50">قبلی</button>
          <span className="text-gray-700">
            صفحه {pagination.currentPage.toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')} (کل: {pagination.totalItems.toLocaleString('fa-IR')})
          </span>
          <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages || isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50">بعدی</button>
        </div>
      )}
    </div>
  );
};

export default OrderManagementList;
