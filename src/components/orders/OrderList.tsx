'use client'; // This component fetches data and manages state

import React, { useEffect, useState, useCallback } from 'react';
import OrderListItem, { OrderItem } from './OrderListItem';
import { createClient } from '@/lib/supabase/client';
import SkeletonCard from '@/components/ui/SkeletonCard'; // Import SkeletonCard

interface OrderListProps {
  userRole: 'user' | 'chef' | 'admin' | null;
  initialOrders?: OrderItem[];
  statusFilter?: string;
  onOrderSelect?: (orderId: string) => void;
  additionalApiParams?: Record<string, string>; // For extra query params like viewMode
}

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems?: number;
  totalPages?: number;
}

const OrderList: React.FC<OrderListProps> = ({ userRole, initialOrders, statusFilter, onOrderSelect }) => {
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders || []);
  const [isLoading, setIsLoading] = useState(!initialOrders);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10,
  });
  const supabase = createClient(); // Supabase client

  const fetchOrders = useCallback(async (page = 1, newPageSize?: number) => {
    const currentLimit = newPageSize || pagination.pageSize;
    // setError(null); // Keep error until successful fetch
    // setIsLoading(true); // Already handled or handled differently for realtime

    try {
      const urlParams = new URLSearchParams({
        page: String(page),
        limit: String(currentLimit),
      });
      if (statusFilter) {
        urlParams.append('status', statusFilter);
      }
      // Use additionalApiParams here
      if (additionalApiParams) {
        for (const key in additionalApiParams) {
          if (Object.prototype.hasOwnProperty.call(additionalApiParams, key) && additionalApiParams[key] !== undefined) {
            urlParams.append(key, additionalApiParams[key]);
          }
        }
      }

      const response = await fetch(`/api/orders?${urlParams.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در دریافت سفارشات');
      }
      const data = await response.json();
      setOrders(data.data || []);
      if (data.pagination) {
        setPagination({ // Update pagination state fully
            currentPage: data.pagination.currentPage,
            pageSize: currentLimit, // use the actual limit used for the fetch
            totalItems: data.pagination.totalItems,
            totalPages: data.pagination.totalPages,
        });
      } else {
        setPagination({ currentPage: page, pageSize: currentLimit, totalItems: data.data?.length || 0, totalPages: 1 });
      }
       setError(null); // Clear error on successful fetch
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(errorMessage);
      // setOrders([]); // Don't clear orders on error, keep stale data if any
    } finally {
      setIsLoading(false); // Set loading to false after fetch attempt
    }
  }, [statusFilter, pagination.pageSize]);

  useEffect(() => {
    if (!initialOrders) {
      setIsLoading(true); // Set loading true before initial fetch
      fetchOrders(1);
    }

    // Realtime subscription for Chefs viewing 'pending_bids' orders
    if (userRole === 'chef' && (!statusFilter || statusFilter === 'pending_bids')) {
      const channel = supabase
        .channel('public-orders-pending-bids')
        .on(
          'postgres_changes',
          {
            event: 'INSERT', // Listen only to new orders
            schema: 'public',
            table: 'orders',
            filter: `status=eq.pending_bids` // Only for new orders that are pending bids
          },
          (payload) => {
            console.log('Realtime: New pending_bids order received!', payload);
            // Refetch the current page of orders to include the new one if it falls on this page,
            // or simply refetch page 1 to show the newest.
            // For simplicity, refetching current page. A more robust solution might add to list if on page 1.
            fetchOrders(pagination.currentPage);
          }
        )
        .on( // Also listen to updates if an order is no longer pending_bids (e.g. chef_selected or cancelled)
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            // We need to check if the OLD status was pending_bids and new is not,
            // or if an order becomes pending_bids (e.g. re-opened, though less common).
            // This filter is complex for Supabase Realtime directly.
            // A simpler approach is to refetch on any UPDATE to orders if it might affect the list.
            // Or, more targeted: if an order ID that IS in the current list changes status away from pending_bids.
          },
          (payload) => {
            // If an order in the current list is updated away from pending_bids
            const updatedOrder = payload.new as OrderItem;
            if (orders.some(o => o.id === updatedOrder.id) && updatedOrder.status !== 'pending_bids') {
                console.log('Realtime: An order in the list is no longer pending bids', payload);
                fetchOrders(pagination.currentPage); // Refetch to remove it
            }
            // If an order becomes pending_bids (less common, but possible)
            // This is covered if the INSERT listener also handles orders becoming pending_bids
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Chef subscribed to new pending_bids orders.`);
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`Chef subscription error for pending_bids orders:`, err || status);
            // setError(`خطا در اتصال به به‌روزرسانی‌های زنده سفارشات. ${err?.message || ''}`);
          }
        });

      return () => {
        supabase.removeChannel(channel);
        console.log(`Chef unsubscribed from new pending_bids orders.`);
      };
    }
  }, [fetchOrders, initialOrders, userRole, statusFilter, supabase, pagination.currentPage, orders]); // Added orders to deps for update listener

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (pagination.totalPages || 1)) {
        fetchOrders(newPage);
    }
  };


  if (isLoading && orders.length === 0) { // Show skeletons only on initial load when no orders are yet displayed
    return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} rows={2} />)}
            {/* Display 3 skeleton cards, each with 2 text lines */}
        </div>
    );
  }

  if (error && orders.length === 0) { // Show error only if there are no orders to display (even stale ones)
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
