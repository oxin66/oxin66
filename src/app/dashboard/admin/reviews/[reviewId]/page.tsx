'use client'; // For form handling, state, and client-side data fetching/mutation

import React, { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ReviewForAdminList } from '@/components/admin/reviews/ReviewManagementListItem'; // Re-use type
import { StaticStarDisplay } from '@/components/reviews/ReviewListItem'; // For displaying stars
import StarRatingInput from '@/components/reviews/StarRatingInput'; // For editing rating
import { ReviewUpdateByAdminSchema, TReviewUpdateByAdminRequest } from '@/lib/validators/admin';
import { ZodError } from 'zod';


async function fetchReviewDetailsForAdmin(reviewId: string): Promise<ReviewForAdminList | null> {
  try {
    const response = await fetch(`/api/admin/reviews/${reviewId}`);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'خطا در دریافت جزئیات بازخورد');
    }
    const data = await response.json();
    return data.data as ReviewForAdminList; // Assuming API returns data in data field
  } catch (error) {
    console.error("Failed to fetch review details for admin:", error);
    return null;
  }
}

export default function AdminEditReviewPage() {
  const router = useRouter();
  const params = useParams();
  const reviewId = params.reviewId as string;

  const [review, setReview] = useState<ReviewForAdminList | null>(null);
  const [formData, setFormData] = useState<Partial<TReviewUpdateByAdminRequest>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (reviewId) {
      setIsLoading(true);
      fetchReviewDetailsForAdmin(reviewId)
        .then(reviewData => {
          if (reviewData) {
            setReview(reviewData);
            setFormData({
              rating: reviewData.rating,
              comment: reviewData.comment || '',
              is_public: reviewData.is_public,
              // admin_moderation_notes: reviewData.admin_moderation_notes || '', // If this field exists
            });
          } else {
            setError('بازخورد یافت نشد.');
          }
        })
        .catch(err => setError((err as Error).message))
        .finally(() => setIsLoading(false));
    }
  }, [reviewId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    setError(null); setSuccessMessage(null);
  };

  const handleRatingChange = (newRating: number) => {
    setFormData(prev => ({ ...prev, rating: newRating }));
    setFieldErrors(prev => ({ ...prev, rating: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!review) return;

    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    // Ensure rating is a number if present
    const dataToValidate = {
        ...formData,
        rating: formData.rating ? Number(formData.rating) : undefined,
    };

    const validationResult = ReviewUpdateByAdminSchema.partial().safeParse(dataToValidate);

    if (!validationResult.success) {
      const errors: Record<string, string | undefined> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFieldErrors(errors);
      setError('لطفاً خطاهای فرم را اصلاح کنید.');
      setIsUpdating(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.data),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'خطا در به‌روزرسانی بازخورد.');
      }
      setSuccessMessage('بازخورد با موفقیت به‌روز شد.');
      setReview(result.data); // Update local review state
      // Re-initialize form with new data
      setFormData({
        rating: result.data.rating,
        comment: result.data.comment || '',
        is_public: result.data.is_public,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!review || !confirm(`آیا از حذف این بازخورد مطمئن هستید؟ این عمل قابل بازگشت نیست.`)) return;

    setIsDeleting(true);
    setError(null);
    setSuccessMessage(null);
    try {
        const response = await fetch(`/api/admin/reviews/${reviewId}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'خطا در حذف بازخورد.');
        }
        setSuccessMessage('بازخورد با موفقیت حذف شد.');
        alert('بازخورد حذف شد. شما به لیست بازخوردها هدایت می‌شوید.');
        router.push('/dashboard/admin/reviews');
    } catch (err) {
        setError((err as Error).message);
    } finally {
        setIsDeleting(false);
    }
  };


  if (isLoading) return <div className="text-center py-10">در حال بارگذاری جزئیات بازخورد...</div>;
  if (error && !review) return <div className="text-center py-10 text-red-500">خطا: {error}</div>;
  if (!review) return <div className="text-center py-10">بازخورد یافت نشد.</div>;

  return (
    <div dir="rtl">
      <header className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">ویرایش بازخورد #{review.id.substring(0, 8)}...</h1>
             <p className="text-sm text-gray-500">سفارش:
                <Link href={`/dashboard/admin/orders/${review.order_id}`} className="text-blue-600 hover:underline">
                    {review.order_id.substring(0,8)}...
                </Link>
            </p>
        </div>
        <Link href="/dashboard/admin/reviews" className="text-sm text-blue-600 hover:underline">
            &larr; بازگشت به لیست بازخوردها
        </Link>
      </header>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md mb-4 text-sm" role="alert">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded-md mb-4 text-sm" role="alert">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 shadow-md rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><strong>کاربر:</strong> {review.userProfile?.full_name || review.user_id}</p>
            <p><strong>آشپز:</strong> {review.chefProfile?.full_name || review.chef_id}</p>
            <p><strong>تاریخ ثبت:</strong> {new Date(review.created_at).toLocaleString('fa-IR')}</p>
            <div><strong>امتیاز فعلی:</strong> <StaticStarDisplay rating={review.rating} size={18}/></div>
        </div>
        <hr/>

        <div>
          <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">تغییر امتیاز (۱-۵):</label>
          <StarRatingInput
            initialRating={formData.rating || 0}
            onRatingChange={handleRatingChange}
            size={28}
          />
          {fieldErrors.rating && <p className="text-xs text-red-500 mt-1">{fieldErrors.rating}</p>}
        </div>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">متن نظر:</label>
          <textarea name="comment" id="comment" value={formData.comment || ''} onChange={handleChange}
                 rows={5} className={`w-full p-2 border rounded-md ${fieldErrors.comment ? 'border-red-500' : 'border-gray-300'}`} />
          {fieldErrors.comment && <p className="text-xs text-red-500 mt-1">{fieldErrors.comment}</p>}
        </div>

        <div className="flex items-center">
            <input type="checkbox" name="is_public" id="is_public" checked={formData.is_public || false}
                   onChange={handleChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded ml-2 focus:ring-indigo-500" />
            <label htmlFor="is_public" className="text-sm font-medium text-gray-700">نمایش عمومی این بازخورد</label>
        </div>

        {/* Admin Moderation Notes - if implemented */}
        {/* <div>
          <label htmlFor="admin_moderation_notes" className="block text-sm font-medium text-gray-700 mb-1">یادداشت بررسی ادمین:</label>
          <textarea name="admin_moderation_notes" id="admin_moderation_notes" value={formData.admin_moderation_notes || ''} onChange={handleChange}
                 rows={2} className="w-full p-2 border border-gray-300 rounded-md" />
        </div> */}

        <div className="flex flex-col sm:flex-row justify-between items-center pt-3 gap-3">
            <button type="submit" disabled={isUpdating || isDeleting}
                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-gray-400">
              {isUpdating ? 'در حال ذخیره...' : 'ذخیره تغییرات بازخورد'}
            </button>
            <button type="button" onClick={handleDelete} disabled={isUpdating || isDeleting}
                    className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700 disabled:bg-gray-400">
              {isDeleting ? 'در حال حذف...' : 'حذف این بازخورد'}
            </button>
        </div>
      </form>
    </div>
  );
}
