// This page is protected by AdminDashboardLayout and middleware
import ReviewManagementList from '@/components/admin/reviews/ReviewManagementList';

export default async function AdminManageReviewsPage() {
  // The AdminDashboardLayout already ensures that only admins can access this page.

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">مدیریت بازخوردها</h1>
        <p className="mt-1 text-sm text-gray-600">
          در این بخش می‌توانید لیست تمام بازخوردهای ثبت شده توسط کاربران برای آشپزها را مشاهده و مدیریت کنید.
        </p>
      </header>

      <ReviewManagementList />

    </div>
  );
}
