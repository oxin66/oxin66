'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReviewListItem, { ReviewItemData } from './ReviewListItem';

interface ReviewListProps {
  chefId: string; // To fetch reviews for a specific chef
  // Can add props for initial reviews, sorting, etc.
}

interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const ReviewList: React.FC<ReviewListProps> = ({ chefId }) => {
  const [reviews, setReviews] = useState<ReviewItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    pageSize: 5, // Show 5 reviews per page, for example
    totalItems: 0,
    totalPages: 1,
  });

  const fetchReviews = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.pageSize),
      });
      const response = await fetch(`/api/chefs/${chefId}/reviews?${params.toString()}`);
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
  }, [chefId, pagination.pageSize]);

  useEffect(() => {
    if (chefId) {
      fetchReviews(1);
    }
  }, [chefId, fetchReviews]); // fetchReviews is stable due to its own deps

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      fetchReviews(newPage);
    }
  };

  // TODO: Consider Supabase Realtime subscription for new reviews if needed for a super live feed,
  // though for reviews, periodic fetching or fetching on profile view is often sufficient.

  if (isLoading) {
    return <div className="text-center py-5"><p>در حال بارگذاری بازخوردها...</p></div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-center" role="alert">
        <p className="font-bold">خطا</p>
        <p>{error}</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg p-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <p className="mt-2 text-gray-600">هنوز هیچ بازخوردی برای این آشپز ثبت نشده است.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0"> {/* Removed space-y-4 for direct concatenation of items */}
      {reviews.map((review) => (
        <ReviewListItem key={review.id} review={review} />
      ))}
      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 space-x-reverse mt-6 pt-4 border-t" dir="rtl">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1 || isLoading}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            قبلی
          </button>
          <span className="text-sm text-gray-700">
            صفحه {pagination.currentPage.toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')}
          </span>
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages || isLoading}
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
