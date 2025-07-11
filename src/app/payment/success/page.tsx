'use client'; // To read searchParams

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const refId = searchParams.get('refId');

  return (
    <div className="container mx-auto px-4 py-12 text-center min-h-[calc(100vh-200px)] flex flex-col items-center justify-center" dir="rtl">
      <div className="bg-green-100 p-8 rounded-lg shadow-lg max-w-md w-full">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-3xl font-bold text-green-700 mb-4">پرداخت موفقیت‌آمیز بود!</h1>
        <p className="text-gray-700 mb-2">
          از پرداخت شما سپاسگزاریم. سفارش شما اکنون در حال آماده‌سازی توسط آشپز می‌باشد.
        </p>
        {orderId && (
          <p className="text-sm text-gray-600">
            شماره سفارش: <span className="font-semibold text-gray-800">{orderId.substring(0,12)}...</span>
          </p>
        )}
        {refId && refId !== 'ALREADY_VERIFIED' && (
          <p className="text-sm text-gray-600 mt-1">
            کد پیگیری زرین‌پال: <span className="font-semibold text-gray-800">{refId}</span>
          </p>
        )}
         {refId === 'ALREADY_VERIFIED' && (
          <p className="text-sm text-orange-600 mt-1">این تراکنش قبلاً با موفقیت تأیید شده بود.</p>
        )}
        <div className="mt-8 space-y-3">
          <Link href={`/dashboard/user/orders/${orderId || ''}`} legacyBehavior>
            <a className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150">
              مشاهده جزئیات سفارش
            </a>
          </Link>
          <Link href="/dashboard/user/orders" legacyBehavior>
            <a className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors duration-150">
              بازگشت به لیست سفارشات
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
