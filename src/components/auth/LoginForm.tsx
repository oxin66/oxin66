'use client'; // This will be a client component due to form interactions

import React, { useState } from 'react';

export default function LoginForm() {
  const [identifier, setIdentifier] = useState(''); // Can be email or phone
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    // TODO: Implement actual login logic with Supabase
    console.log('Login attempt with:', { identifier, password });
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Example error:
    // setError('نام کاربری یا رمز عبور اشتباه است.');
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border-r-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
          <p className="font-bold">خطا</p>
          <p>{error}</p>
        </div>
      )}
      <div>
        <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 text-right mb-1">
          ایمیل یا شماره موبایل
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
          placeholder="مثال: user@example.com یا 09123456789"
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-right"
          placeholder="رمز عبور خود را وارد کنید"
          dir="rtl"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ml-2"
          />
          <label htmlFor="remember-me" className="text-sm text-gray-700">
            مرا به خاطر بسپار
          </label>
        </div>
        <div className="text-sm">
          <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
            رمز عبور خود را فراموش کرده‌اید؟
          </a>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
        >
          {isLoading ? 'در حال ورود...' : 'ورود'}
        </button>
      </div>
    </form>
  );
}
