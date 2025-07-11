'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ReviewListItem, { ReviewItemData } from '@/components/reviews/ReviewListItem'; // Re-use

interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface ChefPublicReviewListProps {
  chefId: string;
  initialReviews: ReviewItemData[];
  initialPagination: PaginationInfo;
}

const ChefPublicReviewList: React.FC<ChefPublicReviewListProps> = ({
    chefId,
    initialReviews,
    initialPagination
}) => {
  const [reviews, setReviews] = useState<ReviewItemData[]>(initialReviews);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMoreReviews = useCallback(async () => {
    if (pagination.currentPage >= pagination.totalPages) return; // No more pages

    setIsLoadingMore(true);
    setError(null);
    try {
      const nextPage = pagination.currentPage + 1;
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(pagination.pageSize),
      });
      const response = await fetch(`/api/chefs/${chefId}/reviews?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در بارگذاری بازخوردهای بیشتر');
      }
      const data = await response.json();
      setReviews(prevReviews => [...prevReviews, ...(data.data || [])]);
      setPagination(data.pagination || prevPagination => ({...prevPagination, currentPage: nextPage})); // Update pagination from API
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chefId, pagination]);

  // Reset reviews if initialReviews change (e.g. chefId changes on a dynamic page, though less common for this component)
  useEffect(() => {
    setReviews(initialReviews);
    setPagination(initialPagination);
  }, [initialReviews, initialPagination]);


  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
         <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <p className="mt-2 text-gray-600 dark:text-gray-400">هنوز بازخوردی برای این آشپز ثبت نشده است.</p>
      </div>
    );
  }

  return (
    <div dir="rtl">
      <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-700 rounded-lg border dark:border-gray-700 shadow-sm overflow-hidden">
        {reviews.map((review) => (
          <ReviewListItem key={review.id} review={review} />
        ))}
      </div>

      {error && (
        <div className="mt-4 bg-red-100 border-red-500 text-red-700 p-3 rounded-md text-sm text-center" role="alert">
          {error}
        </div>
      )}

      {pagination.currentPage < pagination.totalPages && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMoreReviews}
            disabled={isLoadingMore}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? 'در حال بارگذاری...' : 'بارگذاری بازخوردهای بیشتر'}
          </button>
        </div>
      )}
       {reviews.length > 0 && pagination.currentPage === pagination.totalPages && pagination.totalItems > pagination.pageSize && (
         <p className="text-center text-xs text-gray-500 mt-4">پایان لیست بازخوردها.</p>
       )}
    </div>
  );
};

export default ChefPublicReviewList;
