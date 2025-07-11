'use client'; // To read searchParams

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const error = searchParams.get('error');
  const authority = searchParams.get('authority');
  const code = searchParams.get('code');

  let errorMessage = 'پرداخت شما ناموفق بود.';
  if (error === 'verification_failed') {
    errorMessage = 'تأیید پرداخت با درگاه با خطا مواجه شد. لطفاً در صورت کسر وجه، با پشتیبانی تماس بگیرید.';
  } else if (error === 'transaction_not_found') {
    errorMessage = 'اطلاعات تراکنش شما یافت نشد. لطفاً با پشتیبانی تماس بگیرید.';
  } else if (error === 'gateway_error') {
    errorMessage = 'خطایی در ارتباط با درگاه پرداخت رخ داد. لطفاً مجدداً تلاش کنید.';
  } else if (error) {
    errorMessage = `پرداخت ناموفق بود. خطا: ${error}`;
  }
  if (code && code !== '0') {
      errorMessage += ` (کد خطا: ${code})`
  }


  return (
    <div className="container mx-auto px-4 py-12 text-center min-h-[calc(100vh-200px)] flex flex-col items-center justify-center" dir="rtl">
      <div className="bg-red-50 p-8 rounded-lg shadow-lg max-w-md w-full">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-3xl font-bold text-red-700 mb-4">پرداخت ناموفق</h1>
        <p className="text-gray-700 mb-2">
          {errorMessage}
        </p>
        {orderId && (
          <p className="text-sm text-gray-600">
            شماره سفارش: <span className="font-semibold text-gray-800">{orderId.substring(0,12)}...</span>
          </p>
        )}
        {authority && (
          <p className="text-sm text-gray-600 mt-1">
            کد ارجاع ناموفق: <span className="font-semibold text-gray-800">{authority}</span>
          </p>
        )}
        <div className="mt-8 space-y-3">
          {orderId ? (
             <Link href={`/dashboard/user/orders/${orderId}`} legacyBehavior>
                <a className="block w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150">
                بازگشت به سفارش و تلاش مجدد
                </a>
            </Link>
          ) : (
            <Link href="/" legacyBehavior>
                <a className="block w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150">
                بازگشت به صفحه اصلی
                </a>
            </Link>
          )}
          <Link href="/contact-support" legacyBehavior>
            <a className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors duration-150">
              تماس با پشتیبانی
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
