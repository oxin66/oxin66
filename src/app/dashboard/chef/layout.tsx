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
            <div className="flex items-center space-x-3 space-x-reverse">
              {userProfile.avatarUrl && (
                <img
                  src={userProfile.avatarUrl}
                  alt="آواتار آشپز"
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <p className="text-sm text-gray-700 hidden sm:block">
                خوش آمدید، {userProfile.fullName || userProfile.email} (آشپز)
              </p>
              <SignOutButton />
            </div>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Verification Status Message for Chef */}
        {userProfile.role === 'chef' && userProfile.verification_status !== 'approved' && (
          <div
            className={`mb-6 p-4 rounded-md text-sm ${
              userProfile.verification_status === 'pending_review' ? 'bg-yellow-50 border-yellow-400 text-yellow-700' :
              userProfile.verification_status === 'rejected' ? 'bg-red-50 border-red-400 text-red-700' :
              userProfile.verification_status === 'needs_more_info' ? 'bg-blue-50 border-blue-400 text-blue-700' :
              'bg-gray-50 border-gray-400 text-gray-700' // Default for other statuses
            } border-r-4`}
            role="alert"
          >
            <p className="font-bold">وضعیت حساب آشپزی شما:</p>
            {userProfile.verification_status === 'pending_review' && (
              <p>حساب شما در حال حاضر "در انتظار بررسی" توسط تیم مدیریت است. پس از تأیید، قادر به ارسال پیشنهاد برای سفارشات خواهید بود.</p>
            )}
            {userProfile.verification_status === 'rejected' && (
              <p>متأسفانه، درخواست شما برای فعالیت به عنوان آشپز "رد شده" است. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.</p>
            )}
            {userProfile.verification_status === 'needs_more_info' && (
              <p>برای تکمیل فرآیند تأیید حساب آشپزی شما، "نیاز به اطلاعات بیشتر" است. لطفاً بخش پیام‌ها یا ایمیل خود را برای دستورالعمل‌های بعدی بررسی کنید یا با پشتیبانی تماس بگیرید.</p>
            )}
            {/* Add more messages for other potential statuses */}
          </div>
        )}

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
                 <Link href="/dashboard/chat" className="block px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                  گفتگوها
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
