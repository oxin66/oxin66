'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReviewManagementListItem, { ReviewForAdminList } from './ReviewManagementListItem';

interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const ReviewManagementList: React.FC = () => {
  const [reviews, setReviews] = useState<ReviewForAdminList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  // Filters
  const [ratingFilter, setRatingFilter] = useState(''); // 1-5 or ''
  const [isPublicFilter, setIsPublicFilter] = useState(''); // 'true', 'false', or ''
  const [searchQuery, setSearchQuery] = useState(''); // For comment text
  const [chefIdFilter, setChefIdFilter] = useState(''); // Input for chef ID
  const [userIdFilter, setUserIdFilter] = useState(''); // Input for user ID

  const [searchTermDebounced, setSearchTermDebounced] = useState('');
  const [debouncedChefId, setDebouncedChefId] = useState('');
  const [debouncedUserId, setDebouncedUserId] = useState('');


  // Debounce search inputs
  useEffect(() => {
    const timerId = setTimeout(() => setSearchTermDebounced(searchQuery), 500);
    return () => clearTimeout(timerId);
  }, [searchQuery]);
  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedChefId(chefIdFilter), 500);
    return () => clearTimeout(timerId);
  }, [chefIdFilter]);
  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedUserId(userIdFilter), 500);
    return () => clearTimeout(timerId);
  }, [userIdFilter]);


  const fetchReviews = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.pageSize),
      });
      if (ratingFilter) params.append('rating', ratingFilter);
      if (isPublicFilter !== '') params.append('isPublic', isPublicFilter);
      if (debouncedChefId) params.append('chefId', debouncedChefId);
      if (debouncedUserId) params.append('userId', debouncedUserId);
      if (searchTermDebounced) params.append('q', searchTermDebounced);

      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در دریافت لیست بازخوردها');
      }
      const data = await response.json();
      setReviews(data.data || []);
      setPagination(data.pagination || { currentPage: 1, pageSize: pagination.pageSize, totalItems: 0, totalPages: 1 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(errorMessage);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, ratingFilter, isPublicFilter, debouncedChefId, debouncedUserId, searchTermDebounced]);

  useEffect(() => {
    setPagination(prev => ({...prev, currentPage: 1})); // Reset to page 1 on filter/search change
    fetchReviews(1);
  }, [ratingFilter, isPublicFilter, debouncedChefId, debouncedUserId, searchTermDebounced, fetchReviews]);


  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
        fetchReviews(newPage);
    }
  };

  if (isLoading && reviews.length === 0) {
    return (
        <div className="text-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">در حال بارگذاری لیست بازخوردها...</p>
        </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label htmlFor="searchReviewQuery" className="block text-xs font-medium text-gray-700 mb-1">جستجو در نظرات:</label>
          <input type="text" id="searchReviewQuery" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="متن نظر..." className="w-full p-1.5 text-sm border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="ratingFilter" className="block text-xs font-medium text-gray-700 mb-1">امتیاز:</label>
          <select id="ratingFilter" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}
            className="w-full p-1.5 text-sm border border-gray-300 rounded-md shadow-sm bg-white">
            <option value="">همه امتیازها</option>
            {[1,2,3,4,5].map(r => <option key={r} value={String(r)}>{r} ستاره</option>)}
          </select>
        </div>
         <div>
          <label htmlFor="isPublicFilter" className="block text-xs font-medium text-gray-700 mb-1">وضعیت نمایش:</label>
          <select id="isPublicFilter" value={isPublicFilter} onChange={(e) => setIsPublicFilter(e.target.value)}
            className="w-full p-1.5 text-sm border border-gray-300 rounded-md shadow-sm bg-white">
            <option value="">همه</option>
            <option value="true">عمومی</option>
            <option value="false">خصوصی (غیرفعال)</option>
          </select>
        </div>
        <div>
          <label htmlFor="chefIdFilter" className="block text-xs font-medium text-gray-700 mb-1">شناسه آشپز:</label>
          <input type="text" id="chefIdFilter" value={chefIdFilter} onChange={(e) => setChefIdFilter(e.target.value)}
            placeholder="ID آشپز..." className="w-full p-1.5 text-sm border border-gray-300 rounded-md shadow-sm" />
        </div>
        <div>
          <label htmlFor="userIdFilter" className="block text-xs font-medium text-gray-700 mb-1">شناسه کاربر:</label>
          <input type="text" id="userIdFilter" value={userIdFilter} onChange={(e) => setUserIdFilter(e.target.value)}
            placeholder="ID کاربر..." className="w-full p-1.5 text-sm border border-gray-300 rounded-md shadow-sm" />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-center" role="alert">
          <p className="font-bold">خطا</p><p>{error}</p>
        </div>
      )}
      {isLoading && <p className="text-center text-gray-500 py-4">در حال به‌روزرسانی لیست...</p>}

      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-10 bg-white rounded-lg shadow p-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <p className="mt-3 text-gray-600">هیچ بازخوردی با فیلترهای انتخاب شده یافت نشد.</p>
        </div>
      )}

      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewManagementListItem key={review.id} review={review} />
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

export default ReviewManagementList;
