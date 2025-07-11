'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // For potential redirection if needed, though Zarinpal handles it

interface PaymentButtonProps {
  orderId: string;
  amount: number; // Amount in Toman for display, API will handle conversion if needed
  orderStatus: string;
  disabled?: boolean;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ orderId, amount, orderStatus, disabled }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter();

  const handlePaymentRequest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/payment/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'خطا در شروع فرآیند پرداخت.');
      }

      if (result.paymentUrl) {
        // Redirect the user to Zarinpal's payment gateway
        window.location.href = result.paymentUrl;
      } else {
        throw new Error('URL درگاه پرداخت دریافت نشد.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده رخ داد.';
      setError(errorMessage);
      alert(`خطا در پرداخت: ${errorMessage}`); // Show alert for now
      setIsLoading(false); // Ensure loading is stopped on error
    }
    // setIsLoading(false); // No need here if redirecting
  };

  // Determine if the button should be shown and enabled
  // Example: Show if order status is 'chef_selected' or 'awaiting_payment'
  const isPayable = orderStatus === 'chef_selected' || orderStatus === 'awaiting_payment';

  if (!isPayable) {
    // Optionally, show a message or nothing if not payable
    if (orderStatus === 'payment_completed' || orderStatus === 'in_preparation' || orderStatus === 'completed') {
        return <p className="text-sm text-green-600 font-semibold">هزینه این سفارش پرداخت شده است.</p>;
    }
    return null;
  }

  return (
    <>
      <button
        onClick={handlePaymentRequest}
        disabled={isLoading || disabled}
        className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? 'در حال انتقال به درگاه...' : `پرداخت ${amount.toLocaleString('fa-IR')} تومان`}
      </button>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </>
  );
};

export default PaymentButton;
