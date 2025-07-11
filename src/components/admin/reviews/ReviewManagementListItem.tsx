'use client';

import React from 'react';
import Link from 'next/link';
import { StaticStarDisplay } from '@/components/reviews/ReviewListItem'; // Re-use star display

export interface ReviewForAdminList {
  id: string;
  order_id: string;
  rating: number;
  comment?: string | null;
  is_public: boolean;
  created_at: string;
  userProfile?: { id: string; full_name?: string | null; email?: string | null } | null;
  chefProfile?: { id: string; full_name?: string | null; email?: string | null } | null;
}

interface ReviewManagementListItemProps {
  review: ReviewForAdminList;
  // onTogglePublic?: (reviewId: string, currentIsPublic: boolean) => Promise<boolean>;
  // onDeleteReview?: (reviewId: string) => Promise<boolean>;
}

const ReviewManagementListItem: React.FC<ReviewManagementListItemProps> = ({ review }) => {

  const commentPreview = review.comment ?
    (review.comment.length > 100 ? review.comment.substring(0, 97) + "..." : review.comment)
    : <span className="italic text-gray-400">بدون نظر متنی</span>;

  return (
    <div className={`bg-white shadow-sm rounded-lg p-4 mb-3 border-l-4 ${review.is_public ? 'border-green-500' : 'border-gray-400'}`} dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">

        {/* Review Info (Rating & Comment Preview) */}
        <div className="lg:col-span-2">
          <div className="flex items-center mb-1">
            <StaticStarDisplay rating={review.rating} size={16} />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed" title={review.comment || undefined}>
            {commentPreview}
          </p>
        </div>

        {/* User & Chef Info */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            <strong>کاربر: </strong>
            <Link href={`/dashboard/admin/users/${review.userProfile?.id}`} className="text-blue-600 hover:underline">
                {review.userProfile?.full_name || review.userProfile?.email || review.user_id.substring(0,8)}
            </Link>
          </p>
          <p>
            <strong>آشپز: </strong>
            <Link href={`/dashboard/admin/users/${review.chefProfile?.id}`} className="text-blue-600 hover:underline">
                {review.chefProfile?.full_name || review.chefProfile?.email || review.chef_id.substring(0,8)}
            </Link>
          </p>
          <p>
            <strong>سفارش: </strong>
            <Link href={`/dashboard/admin/orders/${review.order_id}`} className="text-blue-600 hover:underline">
                #{review.order_id.substring(0, 8)}...
            </Link>
          </p>
        </div>

        {/* Status & Actions */}
        <div className="space-y-2 flex flex-col items-start lg:items-end">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            review.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
          }`}>
            {review.is_public ? 'عمومی' : 'خصوصی (غیرفعال)'}
          </span>
          <p className="text-xs text-gray-400 mt-1">
            تاریخ: {new Date(review.created_at).toLocaleDateString('fa-IR')}
          </p>
          <Link href={`/dashboard/admin/reviews/${review.id}`} legacyBehavior>
            <a className="mt-2 text-xs bg-indigo-500 hover:bg-indigo-600 text-white py-1.5 px-3 rounded-md transition-colors">
              مشاهده/ویرایش جزئیات
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReviewManagementListItem;
