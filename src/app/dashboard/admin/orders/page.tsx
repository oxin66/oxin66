// This page is protected by AdminDashboardLayout and middleware
import OrderManagementList from '@/components/admin/orders/OrderManagementList';

export default async function AdminManageOrdersPage() {
  // The AdminDashboardLayout already ensures that only admins can access this page.

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">مدیریت سفارشات</h1>
        <p className="mt-1 text-sm text-gray-600">
          در این بخش می‌توانید لیست تمام سفارشات ثبت شده در سیستم را مشاهده و وضعیت آن‌ها را پیگیری کنید.
        </p>
      </header>

      <OrderManagementList />

    </div>
  );
}
