'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation'; // Changed from 'next/navigation'
import React, { useState } from 'react';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      // Optionally show an error message to the user
      alert('خطا در خروج از حساب کاربری: ' + error.message);
    } else {
      // Redirect to home page or login page after sign out
      // Using window.location.href to ensure a full refresh which helps clear server component states
      window.location.href = '/login?message=شما با موفقیت خارج شدید';
      // router.push('/login?message=شما با موفقیت خارج شدید');
      // router.refresh(); // Ensure server components are re-evaluated
    }
    setIsLoading(false);
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-400"
    >
      {isLoading ? 'در حال خروج...' : 'خروج از حساب'}
    </button>
  );
}
