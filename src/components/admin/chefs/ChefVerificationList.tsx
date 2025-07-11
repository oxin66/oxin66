'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ChefVerificationListItem, { ChefProfileAdminView } from './ChefVerificationListItem';
// import { createClient } from '@/lib/supabase/client'; // Not needed for direct Supabase calls here, API is used

interface ChefVerificationListProps {
  // Props can be added for initial filters or sorting if needed
}

interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const ChefVerificationList: React.FC<ChefVerificationListProps> = () => {
  const [chefs, setChefs] = useState<ChefProfileAdminView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    pageSize: 10, // Default page size, can be configurable
    totalItems: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState(''); // e.g., 'pending_review', 'approved', etc.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTermDebounced, setSearchTermDebounced] = useState('');


  // Debounce search query
  useEffect(() => {
    const timerId = setTimeout(() => {
      setSearchTermDebounced(searchQuery);
    }, 500); // 500ms delay
    return () => clearTimeout(timerId);
  }, [searchQuery]);


  const fetchChefs = useCallback(async (page = 1, currentStatusFilter = statusFilter, currentSearchQuery = searchTermDebounced) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.pageSize),
      });
      if (currentStatusFilter) {
        params.append('status', currentStatusFilter);
      }
      if (currentSearchQuery) {
        params.append('q', currentSearchQuery);
      }

      const response = await fetch(`/api/admin/chefs?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در دریافت لیست آشپزها');
      }
      const data = await response.json();
      setChefs(data.data || []);
      setPagination(data.pagination || { currentPage: 1, pageSize: pagination.pageSize, totalItems: 0, totalPages: 1 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(errorMessage);
      setChefs([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, statusFilter, searchTermDebounced]); // Dependencies for fetchChefs

  useEffect(() => {
    fetchChefs(1, statusFilter, searchTermDebounced); // Fetch on initial load and when filters/search change
  }, [fetchChefs, statusFilter, searchTermDebounced]); // Removed 'fetchChefs' to avoid loop, it's stable if deps are correct. Re-added because its own deps change.


  const handleUpdateStatus = async (chefId: string, newStatus: string, adminNotes?: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/chefs/${chefId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification_status: newStatus, admin_notes: adminNotes }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'خطا در به‌روزرسانی وضعیت');
      }
      // Optionally, refetch the list or update the specific chef in the local state
      // For simplicity, the ChefVerificationListItem handles its own currentStatus state.
      // A full refetch might be good if sorting or filtering depends on status.
      // fetchChefs(pagination.currentPage); // Or just let the item update its own display
      return true;
    } catch (err) {
      console.error('Update status error:', err);
      // Error is shown in the list item itself
      return false;
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
        setPagination(prev => ({...prev, currentPage: newPage}));
        fetchChefs(newPage);
    }
  };

  const possibleStatusesForFilter = [
    { value: '', label: 'همه وضعیت‌ها' },
    { value: 'pending_review', label: 'در انتظار بررسی' },
    { value: 'approved', label: 'تأیید شده' },
    { value: 'rejected', label: 'رد شده' },
    { value: 'needs_more_info', label: 'نیاز به اطلاعات بیشتر' },
  ];

  if (isLoading && chefs.length === 0) { // Show loading only on initial full load
    return (
        <div className="text-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">در حال بارگذاری لیست آشپزها...</p>
        </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">
              جستجو (نام یا ایمیل):
            </label>
            <input
              type="text"
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو..."
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              فیلتر بر اساس وضعیت تأیید:
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => {setStatusFilter(e.target.value); setPagination(prev => ({...prev, currentPage:1}));}} // Reset to page 1 on filter change
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {possibleStatusesForFilter.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-center" role="alert">
          <p className="font-bold">خطا</p>
          <p>{error}</p>
        </div>
      )}

      {isLoading && <p className="text-center text-gray-500">در حال به‌روزرسانی لیست...</p>}

      {!isLoading && chefs.length === 0 && (
        <div className="text-center py-10 bg-white rounded-lg shadow p-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="mt-3 text-gray-600">
            هیچ آشپزی با فیلترهای انتخاب شده یافت نشد.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {chefs.map((chef) => (
          <ChefVerificationListItem
            key={chef.id}
            chef={chef}
            onUpdateStatus={handleUpdateStatus}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 space-x-reverse mt-8 pb-4" dir="rtl">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1 || isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            قبلی
          </button>
          <span className="text-gray-700">
            صفحه {pagination.currentPage.toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')} (کل: {pagination.totalItems.toLocaleString('fa-IR')})
          </span>
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages || isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
};

export default ChefVerificationList;
