'use client'; // This will be a client component due to form interactions

import React, { useState } from 'react';

export default function LoginForm() {
  const [identifier, setIdentifier] = useState(''); // Can be email or phone
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter(); // From 'next/navigation' for redirection

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    // Supabase client for client-side operations
    const supabase = createClient(); // From '@/lib/supabase/client'

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: identifier, // Assuming identifier is email for now.
                        // If phone number login is enabled in Supabase, this might need adjustment
                        // or use supabase.auth.signInWithOtp for phone.
      password,
    });

    if (signInError) {
      console.error('Supabase Sign In Error:', signInError);
      if (signInError.message.includes('Invalid login credentials')) {
        setError('ایمیل یا رمز عبور نامعتبر است.');
      } else {
        setError(signInError.message || 'خطایی در هنگام ورود رخ داد.');
      }
      setIsLoading(false);
      return;
    }

    if (data.user) {
      // Login successful
      // console.log('Login successful, user:', data.user);
      // Optionally, fetch profile data here to get the role if needed immediately on client
      // Or rely on middleware/layout to handle redirection based on role fetched server-side.

      // Forcing a page reload to ensure middleware and server components pick up the new session
      // This is a common pattern with Supabase SSR auth to refresh everything.
      window.location.href = '/'; // Redirect to homepage, middleware should then route to correct dashboard
      // router.push('/'); // Alternative using Next.js router, but window.location.reload() or href might be more robust for session update
      // router.refresh(); // Another option
    } else {
      setError('ورود انجام نشد. لطفاً دوباره تلاش کنید.');
    }

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
