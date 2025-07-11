import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from '@/components/auth/SignOutButton';

export default async function ChefDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookies());

  if (!userProfile) {
    redirect('/login?message=لطفا برای دسترسی به داشبورد وارد شوید');
  }

  // Ensure only users with 'chef' or 'admin' role can access this dashboard layout
  if (userProfile.role !== 'chef' && userProfile.role !== 'admin') {
    redirect('/?error=unauthorized_dashboard_access');
  }

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-green-600">
                HomeFeast (آشپز)
              </Link>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <p className="text-sm text-gray-700">
                خوش آمدید، {userProfile.fullName || userProfile.email} (آشپز)
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
              <h3 className="text-lg font-semibold text-gray-700 mb-4">منوی آشپز</h3>
              <nav className="space-y-2">
                <Link href="/dashboard/chef/orders" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                  بازار سفارشات (در انتظار پیشنهاد)
                </Link>
                <Link href="/dashboard/chef/my-bids" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                  پیشنهادات ارسالی من
                </Link>
                <Link href="/dashboard/chef/active-orders" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                  سفارشات فعال من
                </Link>
                <Link href="/dashboard/chef/menu" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                  مدیریت منوها
                </Link>
                <Link href="/dashboard/chef/profile" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                  پروفایل آشپزخانه
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
              &copy; {new Date().getFullYear()} HomeFeast Chefs Portal.
          </div>
      </footer>
    </div>
  );
}
