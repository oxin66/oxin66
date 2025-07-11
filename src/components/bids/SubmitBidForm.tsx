'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BidCreationSchema, TBidCreationRequest } from '@/lib/validators/bid'; // Zod Schema
import { ZodError } from 'zod';

interface SubmitBidFormProps {
  orderId: string;
  chefId: string; // Current logged-in chef's ID
  onBidSubmitted?: (bidData: any) => void; // Callback after successful submission
  existingBid?: TBidCreationRequest & { id: string; status: string }; // Pass if chef is editing/resubmitting a withdrawn bid
}

export default function SubmitBidForm({ orderId, chefId, onBidSubmitted, existingBid }: SubmitBidFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<TBidCreationRequest>>({
    bid_amount: existingBid?.bid_amount || undefined,
    estimated_delivery_time_minutes: existingBid?.estimated_delivery_time_minutes || undefined,
    chef_notes: existingBid?.chef_notes || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const validationResult = BidCreationSchema.safeParse(formData);

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

    const validatedData = validationResult.data;

    try {
      // In a real scenario, you might check if the chef can still bid (e.g., order not taken)
      // This is partially handled by API and RLS, but client-side check can improve UX.

      const response = await fetch(`/api/orders/${orderId}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'خطا در ارسال پیشنهاد.');
        if (result.errors) {
            setFieldErrors(result.errors);
        }
      } else {
        // Bid submitted successfully
        console.log('Bid submitted:', result.data);
        if (onBidSubmitted) {
          onBidSubmitted(result.data);
        }
        // Optionally, redirect or show a success message, or update parent component state
        // For now, let parent handle UI update via onBidSubmitted or a page refresh
        alert('پیشنهاد شما با موفقیت ثبت شد!'); // Simple alert for now
        // router.refresh(); // Or use state management to update list of bids/orders
      }
    } catch (err) {
      console.error('Submit bid error:', err);
      setError('یک خطای پیش بینی نشده رخ داد. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if the chef can submit a bid (e.g. if they had a withdrawn bid they might not be able to resubmit directly without adjustments)
  // This logic can be more complex depending on business rules.
  const canSubmit = !existingBid || existingBid.status === 'withdrawn_by_chef';


  if (!canSubmit && existingBid) {
    return (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md" role="alert">
            <p className="font-bold">توجه</p>
            <p>شما قبلاً برای این سفارش پیشنهادی ({existingBid.status === 'pending' ? 'در انتظار' : 'پذیرفته شده'}) ارسال کرده‌اید.</p>
            {/* Link to view/manage existing bid could be here */}
        </div>
    );
  }


  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-md rounded-lg border border-gray-200" dir="rtl">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">ارسال پیشنهاد برای سفارش</h3>

      {error && !Object.keys(fieldErrors).length && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-4" role="alert">
          <p className="font-bold">خطا</p>
          <p>{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="bid_amount" className="block text-sm font-medium text-gray-700 text-right mb-1">
          مبلغ پیشنهادی شما (تومان) <span className="text-red-500">*</span>
        </label>
        <input
          id="bid_amount"
          name="bid_amount"
          type="number"
          value={formData.bid_amount || ''}
          onChange={handleChange}
          className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm text-right ${fieldErrors.bid_amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
          placeholder="مثال: 450000"
        />
        {fieldErrors.bid_amount && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.bid_amount}</p>}
      </div>

      <div>
        <label htmlFor="estimated_delivery_time_minutes" className="block text-sm font-medium text-gray-700 text-right mb-1">
          زمان تخمینی آماده‌سازی و تحویل (دقیقه - اختیاری)
        </label>
        <input
          id="estimated_delivery_time_minutes"
          name="estimated_delivery_time_minutes"
          type="number"
          value={formData.estimated_delivery_time_minutes || ''}
          onChange={handleChange}
          className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm text-right ${fieldErrors.estimated_delivery_time_minutes ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
          placeholder="مثال: 90 (برای ۱ ساعت و ۳۰ دقیقه)"
        />
        {fieldErrors.estimated_delivery_time_minutes && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.estimated_delivery_time_minutes}</p>}
      </div>

      <div>
        <label htmlFor="chef_notes" className="block text-sm font-medium text-gray-700 text-right mb-1">
          یادداشت برای کاربر (اختیاری)
        </label>
        <textarea
          id="chef_notes"
          name="chef_notes"
          rows={3}
          value={formData.chef_notes || ''}
          onChange={handleChange}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
          placeholder="توضیحات بیشتر در مورد پیشنهاد خود، مواد اولیه خاص، یا هر نکته دیگری..."
        />
        {fieldErrors.chef_notes && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.chef_notes}</p>}
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
        >
          {isLoading ? 'در حال ارسال پیشنهاد...' : (existingBid ? ' به‌روزرسانی و ارسال مجدد پیشنهاد' : 'ارسال پیشنهاد')}
        </button>
      </div>
    </form>
  );
}
