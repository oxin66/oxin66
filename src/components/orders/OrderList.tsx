'use client'; // This component fetches data and manages state

import React, { useEffect, useState, useCallback } from 'react';
import OrderListItem, { OrderItem } from './OrderListItem';
import { createClient } from '@/lib/supabase/client'; // For potential client-side actions if any

interface OrderListProps {
  userRole: 'user' | 'chef' | 'admin' | null;
  initialOrders?: OrderItem[]; // For SSR or initial data pass-through
  statusFilter?: string; // e.g., 'pending_bids', 'completed'
  onOrderSelect?: (orderId: string) => void; // Callback when an order is selected
}

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems?: number;
  totalPages?: number;
}

const OrderList: React.FC<OrderListProps> = ({ userRole, initialOrders, statusFilter, onOrderSelect }) => {
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders || []);
  const [isLoading, setIsLoading] = useState(!initialOrders); // Load if no initial orders
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10, // Default page size
  });

  const fetchOrders = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/orders?page=${page}&limit=${pagination.pageSize}`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      // If userRole is 'chef', the API defaults to 'pending_bids' if no statusFilter is provided.
      // If userRole is 'user', the API defaults to their own orders.

      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در دریافت سفارشات');
      }
      const data = await response.json();
      setOrders(data.data || []);
      if (data.pagination) {
        setPagination(prev => ({
            ...prev,
            currentPage: data.pagination.currentPage,
            totalItems: data.pagination.totalItems,
            totalPages: data.pagination.totalPages,
        }));
      } else {
        // If API doesn't return pagination, reset it or handle accordingly
        setPagination(prev => ({ ...prev, currentPage: page, totalItems: data.data?.length || 0, totalPages: 1 }));
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(errorMessage);
      setOrders([]); // Clear orders on error
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, pagination.pageSize]); // userRole is implicitly handled by API

  useEffect(() => {
    if (!initialOrders) { // Only fetch if no initial orders are provided
        fetchOrders(1); // Fetch initial page
    }
  }, [fetchOrders, initialOrders]);

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (pagination.totalPages || 1)) {
        fetchOrders(newPage);
    }
  };


  if (isLoading) {
    return (
        <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-3 text-gray-600">در حال بارگذاری سفارشات...</p>
        </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-center" role="alert">
        <p className="font-bold">خطا</p>
        <p>{error}</p>
        <button
          onClick={() => fetchOrders(1)}
          className="mt-2 bg-red-500 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg shadow">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <p className="mt-3 text-gray-600">
          {statusFilter === 'pending_bids' && userRole === 'chef' ? 'در حال حاضر هیچ سفارش جدیدی برای پیشنهاد دادن وجود ندارد.' :
           userRole === 'user' ? 'شما هنوز هیچ سفارشی ثبت نکرده‌اید.' :
           'هیچ سفارشی با این مشخصات یافت نشد.'}
        </p>
        {userRole === 'user' && !statusFilter && (
            <a href="/dashboard/user/orders/create" className="mt-4 inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg">
                ثبت اولین سفارش
            </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderListItem
            key={order.id}
            order={order}
            userRole={userRole}
            onSelectOrder={onOrderSelect}
        />
      ))}
      {/* Pagination Controls */}
      {pagination.totalPages && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 space-x-reverse mt-8" dir="rtl">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            قبلی
          </button>
          <span className="text-gray-700">
            صفحه {pagination.currentPage.toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')}
          </span>
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderList;
