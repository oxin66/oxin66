import ChatList from '@/components/chat/ChatList';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ChatListPage() {
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookies());

  if (!userProfile) {
    redirect('/login?message=لطفا برای دسترسی به چت وارد شوید');
  }

  // No specific role check here, as both 'user' and 'chef' (and 'admin') can have chats.
  // The ChatList component and its API will only fetch chats relevant to the logged-in user.

  return (
    <div className="container mx-auto px-2 sm:px-4 py-8" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">گفتگوهای شما</h1>
        {/* Placeholder for potential actions like "Start new chat" if applicable outside orders */}
      </div>

      <ChatList currentUser={userProfile} />

      <div className="mt-8 text-center">
        {userProfile.role === 'user' && (
          <Link href="/dashboard/user/orders" className="text-blue-600 hover:underline">
            بازگشت به سفارشات من
          </Link>
        )}
        {userProfile.role === 'chef' && (
          <Link href="/dashboard/chef/orders" className="text-blue-600 hover:underline">
            بازگشت به بازار سفارشات
          </Link>
        )}
         {userProfile.role === 'admin' && ( // Basic link for admin
          <Link href="/dashboard/admin" className="text-blue-600 hover:underline">
            بازگشت به پنل ادمین
          </Link>
        )}
      </div>
    </div>
  );
}
