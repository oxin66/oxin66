// This page should be protected by middleware to ensure only logged-in users (user/admin) can access it.
import CreateOrderForm from '@/components/orders/CreateOrderForm';
import { getCurrentUserProfile } from '@/lib/userUtils'; // To get user info if needed directly on page
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function CreateOrderPage() {
  // Optional: Double-check user authentication and role on the server-side of the page
  // Middleware should handle the primary protection.
  const userProfile = await getCurrentUserProfile(() => cookies());

  if (!userProfile) {
    // This should ideally be caught by middleware, but as a fallback:
    redirect('/login?message=لطفا برای ایجاد سفارش وارد شوید');
  }

  if (userProfile.role !== 'user' && userProfile.role !== 'admin') {
    // If a user with a different role (e.g., 'chef') somehow lands here
    redirect('/?error=unauthorized_action'); // Redirect to home or an error page
  }

  const handleOrderCreation = (orderId: string) => {
    console.log(`Order created with ID: ${orderId}, redirecting...`);
    // Redirection is handled within CreateOrderForm for now,
    // but this callback can be used for additional logic if needed (e.g., analytics)
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumbs or back navigation could be added here */}
        {/* <div className="mb-6">
          <a href="/dashboard/user/orders" className="text-blue-600 hover:underline">
            &larr; بازگشت به لیست سفارشات
          </a>
        </div> */}

        <CreateOrderForm onOrderCreated={handleOrderCreation} />
      </div>
    </div>
  );
}
