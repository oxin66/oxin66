// This page is protected by AdminDashboardLayout and middleware
import UserManagementList from '@/components/admin/users/UserManagementList';

export default async function AdminManageUsersPage() {
  // The AdminDashboardLayout already ensures that only admins can access this page.

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">مدیریت کاربران</h1>
        <p className="mt-1 text-sm text-gray-600">
          در این بخش می‌توانید لیست تمام کاربران ثبت‌نام شده در سیستم (شامل کاربران عادی، آشپزها و ادمین‌ها) را مشاهده و مدیریت کنید.
        </p>
      </header>

      <UserManagementList />

    </div>
  );
}
