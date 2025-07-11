'use client'; // To read searchParams

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PaymentCancelledPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  // const authority = searchParams.get('authority'); // Could also be passed

  return (
    <div className="container mx-auto px-4 py-12 text-center min-h-[calc(100vh-200px)] flex flex-col items-center justify-center" dir="rtl">
      <div className="bg-yellow-50 p-8 rounded-lg shadow-lg max-w-md w-full">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-500 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-3xl font-bold text-yellow-700 mb-4">پرداخت لغو شد</h1>
        <p className="text-gray-700 mb-2">
          شما فرآیند پرداخت را لغو کرده‌اید. سفارش شما هنوز پرداخت نشده است.
        </p>
        {orderId && (
          <p className="text-sm text-gray-600">
            شماره سفارش: <span className="font-semibold text-gray-800">{orderId.substring(0,12)}...</span>
          </p>
        )}
        <div className="mt-8 space-y-3">
          {orderId ? (
            <Link href={`/dashboard/user/orders/${orderId}`} legacyBehavior>
                <a className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150">
                بازگشت به سفارش و تلاش مجدد برای پرداخت
                </a>
            </Link>
          ) : (
             <Link href="/" legacyBehavior>
                <a className="block w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150">
                بازگشت به صفحه اصلی
                </a>
            </Link>
          )}
           <Link href="/dashboard/user/orders" legacyBehavior>
            <a className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors duration-150">
              مشاهده سایر سفارشات
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
