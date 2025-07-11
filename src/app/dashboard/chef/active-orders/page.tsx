// Page for chefs to view and manage their active/assigned orders
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import OrderList from '@/components/orders/OrderList'; // Re-use OrderList component
import Link from 'next/link';

export default async function ChefActiveOrdersPage({
    searchParams,
}: {
    searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookies());

  if (!userProfile) {
    redirect('/login?message=لطفا برای مشاهده سفارشات فعال خود وارد شوید');
  }

  if (userProfile.role !== 'chef' && userProfile.role !== 'admin') {
    // Admins might also see all active orders or impersonate chefs for support
    redirect('/?error=unauthorized_chef_active_orders');
  }

  // Define statuses that are considered "active" for a chef after payment
  // This query param will be used by the OrderList component which passes it to the API
  // The API needs to be updated to handle fetching orders by assigned_chef_id
  const statusQuery = typeof searchParams?.status === 'string'
    ? searchParams.status
    : "in_preparation,ready_for_delivery,out_for_delivery"; // Default active statuses for chef

  const handleOrderSelection = (orderId: string) => {
    // Navigate to a detailed management page for this active order
    // where chef can update status (e.g., to 'ready_for_delivery')
    // redirect(`/dashboard/chef/manage-order/${orderId}`); // Example future route
    console.log(`Chef selected active order ${orderId} to manage.`);
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">سفارشات فعال شما</h1>
        {/* TODO: Add filters for different active statuses if needed */}
      </div>

      <p className="mb-6 text-gray-600">
        در این بخش می‌توانید لیست سفارشاتی که پرداخت آن‌ها توسط کاربر انجام شده و به شما محول گردیده است را مشاهده و مدیریت کنید.
      </p>

      {/*
        The OrderList component currently fetches based on user_id (for users) or status='pending_bids' (for chefs).
        We need to modify OrderList or the API /api/orders (GET) to support fetching orders where:
        1. assigned_chef_id = currentUser.id
        2. status IN ('in_preparation', 'ready_for_delivery', 'out_for_delivery', etc.)

        For now, this will act as a placeholder. The API /api/orders needs adjustment.
        A new prop like `viewMode="chef_active"` could be passed to OrderList,
        or a new API endpoint like /api/chef/active-orders could be created.
      */}
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md mb-6">
        <p className="font-bold">توجه توسعه‌دهنده:</p>
        <p>
          اطمینان حاصل کنید که کامپوننت `OrderList` و API (`/api/orders`) به درستی پارامتر `viewMode="chef_active"` و `statusFilter` (به عنوان لیست وضعیت‌ها) را برای نمایش سفارشات فعال آشپز مدیریت می‌کنند.
        </p>
      </div>

      <OrderList
        userRole={userProfile.role as ('chef' | 'admin')}
        statusFilter={statusQuery} // e.g., "in_preparation,ready_for_delivery"
        // Pass a custom prop or modify OrderList to understand 'viewMode' for its API call
        // For now, we assume OrderList's fetch logic or the API implicitly knows this context
        // or we might need to add a specific prop to OrderList to pass `viewMode`.
        // Let's assume the API will use the user's role and a specific query param for this.
        // The API has been updated to use `viewMode=chef_active` if passed.
        // So, OrderList needs to be able to pass `viewMode` to its fetch call.
        additionalApiParams={{ viewMode: 'chef_active' }}
        onOrderSelect={handleOrderSelection}
      />
    </div>
  );
}
