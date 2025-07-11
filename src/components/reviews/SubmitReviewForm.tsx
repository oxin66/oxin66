'use client';

import React, { useState, FormEvent } from 'react';
import StarRatingInput from './StarRatingInput';
import { ReviewSubmissionSchema, TReviewSubmissionRequest } from '@/lib/validators/review';
import { ZodError } from 'zod';

interface SubmitReviewFormProps {
  orderId: string;
  chefName?: string; // For display purposes
  onSubmitSuccess: (reviewData: any) => void; // Callback on successful submission
  onCancel?: () => void; // Optional: Callback if user cancels
}

const SubmitReviewForm: React.FC<SubmitReviewFormProps> = ({ orderId, chefName, onSubmitSuccess, onCancel }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const dataToValidate: Partial<TReviewSubmissionRequest> = { rating, comment: comment.trim() === '' ? null : comment.trim() };

    // Validate rating separately as it's required
    if (rating === 0) {
        setFieldErrors(prev => ({...prev, rating: "لطفاً یک امتیاز از ۱ تا ۵ ستاره انتخاب کنید."}));
        setError("امتیازدهی الزامی است.");
        setIsLoading(false);
        return;
    }

    const validationResult = ReviewSubmissionSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      const errors: Record<string, string | undefined> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFieldErrors(errors);
      setError('لطفاً خطاهای فرم را اصلاح کنید.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'خطا در ثبت بازخورد.');
        if (result.errors) setFieldErrors(result.errors);
      } else {
        alert('بازخورد شما با موفقیت ثبت شد!'); // Simple success message
        onSubmitSuccess(result.data);
        // Optionally reset form or close modal if it's in a modal
        setRating(0);
        setComment('');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده رخ داد.';
      setError(`خطا: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-6 bg-white shadow-md rounded-lg border border-gray-200" dir="rtl">
      <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">
        ثبت بازخورد برای سفارش {chefName ? `از ${chefName}` : ''}
      </h3>

      {error && !Object.keys(fieldErrors).some(k => k !== 'rating' && fieldErrors[k]) && ( // Show general error if no specific field errors other than rating
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
          امتیاز شما (ستاره) <span className="text-red-500">*</span>
        </label>
        <div className="flex justify-center sm:justify-start">
            <StarRatingInput
                initialRating={rating}
                onRatingChange={(r) => { setRating(r); setFieldErrors(prev => ({...prev, rating: undefined})); setError(null); }}
                size={32} // Larger stars for input
            />
        </div>
        {fieldErrors.rating && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.rating}</p>}
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 text-right mb-1">
          نظر شما (اختیاری)
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={`w-full p-2 border rounded-md shadow-sm focus:outline-none sm:text-sm text-right ${fieldErrors.comment ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
          placeholder="تجربه خود را از این سفارش و عملکرد آشپز بنویسید..."
        />
        {fieldErrors.comment && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.comment}</p>}
      </div>

      <div className="flex flex-col sm:flex-row-reverse sm:justify-start gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading || rating === 0}
          className="w-full sm:w-auto flex justify-center py-2.5 px-5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
        >
          {isLoading ? 'در حال ارسال...' : 'ثبت بازخورد'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto flex justify-center py-2.5 px-5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-100"
          >
            انصراف
          </button>
        )}
      </div>
    </form>
  );
};

export default SubmitReviewForm;
