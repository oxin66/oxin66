'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // Supabase client

// Zod validator for the form
import { z } from 'zod';

const OrderFormSchema = z.object({
  budget: z.preprocess(
    (val) => parseFloat(String(val)), // Convert string to number
    z.number({ invalid_type_error: 'بودجه باید یک عدد باشد.' }).positive({ message: 'بودجه باید بیشتر از صفر باشد.' })
  ),
  numberOfPeople: z.preprocess(
    (val) => parseInt(String(val), 10), // Convert string to integer
    z.number({ invalid_type_error: 'تعداد نفرات باید یک عدد باشد.' }).int().positive({ message: 'تعداد نفرات باید حداقل ۱ نفر باشد.' })
  ),
  cuisineType: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).optional(), // For now, simple array of strings
  description: z.string().optional(),
  // deliveryLocation and preferredDeliveryTime can be added later
});

type OrderFormData = z.infer<typeof OrderFormSchema>;

interface CreateOrderFormProps {
  onOrderCreated?: (orderId: string) => void; // Callback after successful creation
}

export default function CreateOrderForm({ onOrderCreated }: CreateOrderFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState<Partial<OrderFormData>>({
    budget: undefined,
    numberOfPeople: undefined,
    cuisineType: '',
    dietaryRestrictions: [],
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined })); // Clear error on change
  };

  // Example for handling dietary restrictions if using checkboxes or multi-select
  // const handleDietaryChange = (restriction: string) => {
  //   setFormData(prev => {
  //     const currentRestrictions = prev.dietaryRestrictions || [];
  //     if (currentRestrictions.includes(restriction)) {
  //       return { ...prev, dietaryRestrictions: currentRestrictions.filter(r => r !== restriction) };
  //     } else {
  //       return { ...prev, dietaryRestrictions: [...currentRestrictions, restriction] };
  //     }
  //   });
  // };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const validationResult = OrderFormSchema.safeParse(formData);

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
      const response = await fetch('/api/orders', { // Assuming POST to /api/orders
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'خطا در ایجاد سفارش.');
        if (result.errors) {
            setFieldErrors(result.errors);
        }
      } else {
        // Order created successfully
        console.log('Order created:', result);
        if (onOrderCreated) {
          onOrderCreated(result.orderId); // Assuming result contains orderId
        }
        // Optionally, redirect or show a success message
        router.push('/dashboard/user/orders?status=created'); // Redirect to user's orders page
      }
    } catch (err) {
      console.error('Create order error:', err);
      setError('یک خطای پیش بینی نشده رخ داد. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 shadow-lg rounded-lg">
      <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">ایجاد سفارش غذای گروهی جدید</h2>

      {error && !Object.keys(fieldErrors).length && ( // Show general error if no specific field errors
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-4" role="alert">
          <p className="font-bold">خطا</p>
          <p>{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-gray-700 text-right mb-1">
          بودجه کل (تومان) <span className="text-red-500">*</span>
        </label>
        <input
          id="budget"
          name="budget"
          type="number"
          value={formData.budget || ''}
          onChange={handleChange}
          className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm text-right ${fieldErrors.budget ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
          placeholder="مثال: 500000"
          dir="rtl"
        />
        {fieldErrors.budget && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.budget}</p>}
      </div>

      <div>
        <label htmlFor="numberOfPeople" className="block text-sm font-medium text-gray-700 text-right mb-1">
          تعداد نفرات <span className="text-red-500">*</span>
        </label>
        <input
          id="numberOfPeople"
          name="numberOfPeople"
          type="number"
          value={formData.numberOfPeople || ''}
          onChange={handleChange}
          className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm text-right ${fieldErrors.numberOfPeople ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
          placeholder="مثال: 5"
          dir="rtl"
        />
        {fieldErrors.numberOfPeople && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.numberOfPeople}</p>}
      </div>

      <div>
        <label htmlFor="cuisineType" className="block text-sm font-medium text-gray-700 text-right mb-1">
          نوع غذای درخواستی (اختیاری)
        </label>
        <input
          id="cuisineType"
          name="cuisineType"
          type="text"
          value={formData.cuisineType || ''}
          onChange={handleChange}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
          placeholder="مثال: ایرانی، ایتالیایی، فست فود"
          dir="rtl"
        />
      </div>

      {/* Dietary Restrictions - Placeholder for a more complex component like checkboxes or multi-select */}
      <div>
        <label htmlFor="dietaryRestrictions" className="block text-sm font-medium text-gray-700 text-right mb-1">
          محدودیت‌های غذایی (اختیاری - با کاما جدا کنید)
        </label>
        <input
          id="dietaryRestrictions"
          name="dietaryRestrictions"
          type="text"
          value={(formData.dietaryRestrictions || []).join(', ')}
          onChange={(e) => {
            const value = e.target.value;
            setFormData(prev => ({ ...prev, dietaryRestrictions: value ? value.split(',').map(s => s.trim()) : [] }));
          }}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
          placeholder="مثال: گیاهخواری, بدون گلوتن"
          dir="rtl"
        />
      </div>


      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 text-right mb-1">
          توضیحات بیشتر (اختیاری)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={formData.description || ''}
          onChange={handleChange}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
          placeholder="هرگونه درخواست یا توضیح اضافی در مورد سفارش خود را اینجا بنویسید."
          dir="rtl"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
        >
          {isLoading ? 'در حال ثبت سفارش...' : 'ثبت سفارش و درخواست پیشنهاد از آشپزها'}
        </button>
      </div>
       <p className="text-xs text-gray-500 text-center mt-4">
        پس از ثبت، سفارش شما برای آشپزهای نزدیک ارسال می‌شود و می‌توانید پیشنهادات آن‌ها را مشاهده کنید.
      </p>
    </form>
  );
}
