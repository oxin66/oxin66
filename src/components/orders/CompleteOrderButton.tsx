'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CompleteOrderButtonProps {
  orderId: string;
  currentStatus: string;
  onOrderCompleted: () => void; // Callback to refresh or update UI
}

const CompleteOrderButton: React.FC<CompleteOrderButtonProps> = ({ orderId, currentStatus, onOrderCompleted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const completableStatuses = ['delivered', 'out_for_delivery', 'ready_for_delivery', 'in_preparation', 'payment_completed', 'chef_selected'];

  if (!completableStatuses.includes(currentStatus)) {
    return null; // Don't show button if order is not in a completable state
  }

  const handleCompleteOrder = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No body needed for this specific request as per API design
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'خطا در تکمیل سفارش.');
      }

      alert('سفارش با موفقیت تکمیل شد! اکنون می‌توانید بازخورد خود را ثبت کنید.');
      onOrderCompleted(); // Call parent callback (e.g., to refresh page data)
      // router.refresh(); // Or use Next.js router to refresh server components

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده رخ داد.';
      setError(errorMessage);
      alert(`خطا: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleCompleteOrder}
        disabled={isLoading}
        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors duration-150 disabled:bg-gray-400"
      >
        {isLoading ? 'در حال پردازش...' : 'علامت‌گذاری سفارش به عنوان تکمیل شده'}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      <p className="text-xs text-gray-500 mt-1">پس از تکمیل، می‌توانید برای این سفارش بازخورد ثبت کنید.</p>
    </div>
  );
};

export default CompleteOrderButton;
