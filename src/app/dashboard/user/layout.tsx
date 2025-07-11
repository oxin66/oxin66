import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from '@/components/auth/SignOutButton'; // Assuming this component will be created

export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookies());

  if (!userProfile) {
    redirect('/login?message=لطفا برای دسترسی به داشبورد وارد شوید');
  }

  // Ensure only users with 'user' or 'admin' role can access this dashboard layout
  if (userProfile.role !== 'user' && userProfile.role !== 'admin') {
    redirect('/?error=unauthorized_dashboard_access'); // Or redirect to their specific dashboard if applicable
  }

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                HomeFeast (کاربر)
              </Link>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <p className="text-sm text-gray-700">
                خوش آمدید، {userProfile.fullName || userProfile.email}
              </p>
              <SignOutButton />
            </div>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:flex lg:space-x-6 lg:space-x-reverse">
          <aside className="lg:w-1/4 mb-6 lg:mb-0">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">منوی کاربری</h3>
              <nav className="space-y-2">
                <Link href="/dashboard/user/orders" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                  سفارشات من
                </Link>
                <Link href="/dashboard/user/orders/create" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                  ایجاد سفارش جدید
                </Link>
                <Link href="/dashboard/chat" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                  گفتگوها
                </Link>
                <Link href="/dashboard/user/profile" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                  پروفایل کاربری
                </Link>
                {/* Add more links as needed */}
              </nav>
            </div>
          </aside>
          <main className="lg:w-3/4">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow">
              {children}
            </div>
          </main>
        </div>
      </div>

      <footer className="bg-white mt-12 border-t">
          <div className="container mx-auto py-6 px-4 text-center text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} HomeFeast. تمامی حقوق محفوظ است.
          </div>
      </footer>
    </div>
  );
}
