'use client'; // This will be a client component due to form interactions

import React, { useState } from 'react';

export default function SignupForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'chef'>('user'); // New state for role
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('رمزهای عبور یکسان نیستند.');
      setIsLoading(false);
      return;
    }

    // TODO: Implement actual signup logic with Supabase
    console.log('Signup attempt with:', { fullName, email, phoneNumber, password });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Example error:
    // setError('ایمیل یا شماره موبایل قبلا ثبت شده است.');
    // Example success:
    setSuccessMessage('ثبت نام شما با موفقیت انجام شد. لطفاً ایمیل خود را برای فعال سازی حساب کاربری بررسی کنید.');
    // Reset form or redirect user after success
    // setFullName(''); setEmail(''); setPhoneNumber(''); setPassword(''); setConfirmPassword('');
    setIsLoading(false);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError('رمزهای عبور یکسان نیستند.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, fullName, phoneNumber, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'خطایی در هنگام ثبت نام رخ داد.');
      } else {
        setSuccessMessage(data.message || 'ثبت نام شما با موفقیت انجام شد. لطفاً ایمیل خود را برای فعال سازی حساب کاربری بررسی کنید (در صورت فعال بودن تایید ایمیل).');
        // Reset form or redirect user after success can be handled here
        // For example, clear the form:
        // setFullName(''); setEmail(''); setPhoneNumber(''); setPassword(''); setConfirmPassword(''); setRole('user');
      }
    } catch (err) {
      setError('یک خطای پیش بینی نشده رخ داد. لطفاً دوباره تلاش کنید.');
      console.error('Signup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (successMessage) {
    return (
      <div className="bg-green-100 border-r-4 border-green-500 text-green-700 p-6 rounded-md text-center" role="alert">
        <p className="font-bold text-lg mb-2">ثبت نام موفق</p>
        <p>{successMessage}</p>
        <a href="/login" className="mt-4 inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg">
            ورود به حساب کاربری
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-100 border-r-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
          <p className="font-bold">خطا در ثبت نام</p>
          <p>{error}</p>
        </div>
      )}

      {/* Role Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 text-right mb-2">
          نوع حساب کاربری:
        </label>
        <div className="flex items-center justify-end space-x-4 space-x-reverse">
          <div className="flex items-center">
            <input
              id="role-user"
              name="role"
              type="radio"
              value="user"
              checked={role === 'user'}
              onChange={() => setRole('user')}
              className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 ml-2"
            />
            <label htmlFor="role-user" className="text-sm font-medium text-gray-700">
              کاربر عادی (سفارش دهنده غذا)
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="role-chef"
              name="role"
              type="radio"
              value="chef"
              checked={role === 'chef'}
              onChange={() => setRole('chef')}
              className="focus:ring-green-500 h-4 w-4 text-green-600 border-gray-300 ml-2"
            />
            <label htmlFor="role-chef" className="text-sm font-medium text-gray-700">
              آشپز (ارائه دهنده غذا)
            </label>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 text-right mb-1">
          نام و نام خانوادگی
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-right"
          placeholder="مثال: علی محمدی"
          dir="rtl"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-right mb-1">
          آدرس ایمیل
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-left"
          placeholder="user@example.com"
          dir="ltr" // Email is typically LTR
        />
      </div>

      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 text-right mb-1">
          شماره موبایل (اختیاری)
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          autoComplete="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-right"
          placeholder="مثال: 09123456789"
          dir="rtl"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 text-right mb-1">
          رمز عبور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-right"
          placeholder="حداقل ۸ کاراکتر"
          dir="rtl"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 text-right mb-1">
          تکرار رمز عبور
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-right"
          placeholder="رمز عبور خود را مجددا وارد کنید"
          dir="rtl"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
        >
          {isLoading ? 'در حال ایجاد حساب...' : 'ثبت نام و ایجاد حساب'}
        </button>
      </div>
       <p className="text-xs text-gray-500 text-center mt-4">
        با کلیک بر روی "ثبت نام و ایجاد حساب"، شما با <a href="/terms" className="text-green-600 hover:underline">شرایط خدمات</a> و <a href="/privacy" className="text-green-600 hover:underline">سیاست حفظ حریم خصوصی</a> ما موافقت می‌کنید.
      </p>
    </form>
  );
}
