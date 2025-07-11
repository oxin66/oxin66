// This page should be protected by middleware to ensure only logged-in chefs (or admins) can access it.
import OrderList from '@/components/orders/OrderList';
import { getCurrentUserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ChefOrdersPage({
    searchParams,
}: {
    searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const userProfile = await getCurrentUserProfile(() => cookies());

  if (!userProfile) {
    redirect('/login?message=لطفا برای مشاهده سفارشات وارد شوید');
  }

  if (userProfile.role !== 'chef' && userProfile.role !== 'admin') {
    redirect('/?error=unauthorized_chef_dashboard');
  }

  // For chefs, we typically want to show orders that are 'pending_bids'
  // The OrderList component and the API will default to this for chefs if no status is provided.
  // However, we can allow filtering via searchParams if needed in the future.
  const statusQuery = typeof searchParams?.status === 'string' ? searchParams.status : 'pending_bids';

  const handleOrderSelection = (orderId: string) => {
    // When a chef selects an order, redirect to a page to submit a bid or view details
    // For now, just log. This will be implemented in the bidding feature.
    console.log(`Chef selected order ${orderId} to potentially bid on.`);
    // router.push(`/dashboard/chef/orders/${orderId}/bid`); // Example future route
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">سفارشات در انتظار پیشنهاد</h1>
        {/* Future: Add filter controls here if needed */}
      </div>

      <p className="mb-6 text-gray-600">
        در این بخش می‌توانید لیست سفارشاتی که کاربران ثبت کرده‌اند و منتظر پیشنهاد آشپزها هستند را مشاهده کنید.
        برای ارسال پیشنهاد، روی سفارش مورد نظر کلیک کنید.
      </p>

      <OrderList
        userRole={userProfile.role as ('chef' | 'admin')}
        statusFilter={statusQuery} // Chefs primarily see 'pending_bids'
        onOrderSelect={handleOrderSelection}
      />

      {/* Example for future navigation or actions for chefs */}
      {/* <div className="mt-8">
        <Link href="/dashboard/chef/my-bids" className="text-blue-600 hover:underline">
          مشاهده پیشنهادات ارسال شده من
        </Link>
      </div> */}
    </div>
  );
}
