import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SignOutButton from '@/components/auth/SignOutButton'; // Re-use the existing sign out button

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookies());

  if (!userProfile) {
    redirect('/login?message=لطفا برای دسترسی به پنل مدیریت وارد شوید');
  }

  // Ensure only users with 'admin' role can access this dashboard layout
  if (userProfile.role !== 'admin') {
    console.warn(`Unauthorized access attempt to admin dashboard by user ${userProfile.id} with role ${userProfile.role}`);
    redirect('/?error=unauthorized_admin_access'); // Redirect to home or a generic unauthorized page
  }

  return (
    <div className="min-h-screen bg-gray-200" dir="rtl">
      <header className="bg-slate-800 text-white shadow-md">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard/admin" className="text-xl font-bold hover:text-slate-300">
                HomeFeast - پنل مدیریت
              </Link>
            </div>
            <div className="flex items-center space-x-4 space-x-reverse">
              <p className="text-sm">
                ادمین: {userProfile.fullName || userProfile.email}
              </p>
              <NotificationBell />
              <SignOutButton />
            </div>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:flex lg:space-x-6 lg:space-x-reverse">
          <aside className="lg:w-1/5 mb-6 lg:mb-0">
            <div className="bg-white p-5 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">منوی مدیریت</h3>
              <nav className="space-y-1">
                <Link
                  href="/dashboard/admin"
                  className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
                >
                  داشبورد اصلی
                </Link>
                <Link
                  href="/dashboard/admin/chefs"
                  className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
                >
                  مدیریت تأیید آشپزها
                </Link>
                <Link
                  href="/dashboard/admin/users"
                  className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
                >
                  مدیریت کاربران
                </Link>
                <Link
                  href="/dashboard/admin/orders"
                  className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
                >
                  مدیریت سفارشات
                </Link>
                <Link
                  href="/dashboard/admin/reviews"
                  className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
                >
                  مدیریت بازخوردها
                </Link>
                {/* <Link
                  href="/dashboard/admin/settings"
                  className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
                >
                  مدیریت سفارشات (به زودی)
                </Link> */}
                {/* Add more admin links as needed */}
              </nav>
            </div>
          </aside>
          <main className="lg:w-4/5">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md min-h-[calc(100vh-12rem)]">
              {children}
            </div>
          </main>
        </div>
      </div>

      <footer className="bg-slate-800 text-white mt-12 border-t border-slate-700">
          <div className="container mx-auto py-4 px-4 text-center text-xs">
              &copy; {new Date().getFullYear()} HomeFeast Admin Panel.
          </div>
      </footer>
    </div>
  );
}
