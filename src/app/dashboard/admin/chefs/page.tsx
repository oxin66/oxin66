// This page is protected by AdminDashboardLayout and middleware
import ChefVerificationList from '@/components/admin/chefs/ChefVerificationList';
// No need to fetch user profile here again, as AdminDashboardLayout already does that for access control.

export default async function AdminManageChefsPage() {
  // The AdminDashboardLayout already ensures that only admins can access this page.
  // We can directly render the component responsible for listing and managing chefs.

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">مدیریت تأیید آشپزها</h1>
        <p className="mt-1 text-sm text-gray-600">
          در این بخش می‌توانید لیست آشپزهای ثبت‌نام شده را مشاهده کرده و وضعیت تأیید آن‌ها را مدیریت کنید.
        </p>
      </header>

      <ChefVerificationList />

    </div>
  );
}
