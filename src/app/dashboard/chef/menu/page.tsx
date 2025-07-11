// This page is protected by ChefDashboardLayout and middleware
import MenuListManagement from '@/components/chef/menu/MenuListManagement';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ChefMenuManagementPage() {
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookies());

  if (!userProfile) {
    redirect('/login?message=لطفا برای دسترسی به مدیریت منو وارد شوید');
  }

  if (userProfile.role !== 'chef') {
    // Non-chefs should not access this page, even if somehow they bypass layout check
    redirect('/?error=unauthorized_chef_section');
  }

  if (userProfile.verification_status !== 'approved') {
    return (
        <div className="container mx-auto px-4 py-8 text-center" dir="rtl">
            <h1 className="text-2xl font-bold text-orange-600 mb-4">دسترسی به مدیریت منو</h1>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-6 rounded-md max-w-lg mx-auto shadow">
                <p className="font-semibold mb-2">حساب آشپزی شما هنوز تأیید نشده است.</p>
                <p className="text-sm">
                    برای افزودن و مدیریت آیتم‌های منو، ابتدا حساب شما باید توسط تیم مدیریت HomeFeast تأیید شود.
                    لطفاً وضعیت تأیید حساب خود را در <Link href="/dashboard/chef/profile" className="text-blue-600 hover:underline font-medium">پروفایل آشپزخانه</Link> بررسی کنید یا منتظر اطلاع‌رسانی از طرف ما باشید.
                </p>
            </div>
             <div className="mt-8">
                <Link href="/dashboard/chef" className="text-blue-600 hover:underline">
                    &larr; بازگشت به داشبورد آشپز
                </Link>
            </div>
        </div>
    );
  }


  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">مدیریت منوی آشپزخانه</h1>
        <p className="mt-1 text-sm text-gray-600">
          در این بخش می‌توانید آیتم‌های منوی خود را اضافه، ویرایش، یا حذف کنید و وضعیت در دسترس بودن آن‌ها را مدیریت نمایید.
        </p>
      </header>

      <MenuListManagement chefProfile={userProfile} />

    </div>
  );
}
