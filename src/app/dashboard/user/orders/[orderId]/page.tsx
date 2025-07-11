// Page for user to view their specific order and its bids
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BidList from '@/components/bids/BidList';
import OrderListItem, { OrderItem as OrderDetailItem } from '@/components/orders/OrderListItem'; // Re-use for displaying order details

interface UserOrderDetailsPageProps {
  params: { orderId: string };
}

async function getOrderDetails(orderId: string, supabaseClient: any, currentUserId: string): Promise<OrderDetailItem | null> {
  const { data, error } = await supabaseClient
    .from('orders')
    .select(`
        *,
        profiles!orders_user_id_fkey (full_name, avatar_url),
        bids!orders_accepted_bid_id_fkey (
            *,
            profiles!bids_chef_id_fkey (full_name, avatar_url)
        )
    `)
    .eq('id', orderId)
    .eq('user_id', currentUserId) // Ensure the user owns this order
    .single();

  if (error) {
    console.error('Error fetching order details for user:', error.message);
    return null;
  }
  return data as OrderDetailItem; // Cast needed due to complex select
}


export default async function UserOrderDetailsPage({ params }: UserOrderDetailsPageProps) {
  const { orderId } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    redirect('/login?message=لطفا برای مشاهده جزئیات سفارش وارد شوید');
  }
  if (userProfile.role !== 'user' && userProfile.role !== 'admin') {
    redirect('/?error=unauthorized_action');
  }

  const order = await getOrderDetails(orderId, supabase, userProfile.id);

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-red-600 mb-4">خطا</h1>
        <p className="text-gray-700">سفارش مورد نظر یافت نشد یا شما اجازه دسترسی به آن را ندارید.</p>
        <a href="/dashboard/user/orders" className="mt-4 inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded">
          بازگشت به لیست سفارشات
        </a>
      </div>
    );
  }

  const handleBidAccepted = (acceptedBid: any, updatedOrder: any) => {
    // This callback can be used to update the page state if not doing a full reload
    // For now, BidList handles reload on accept.
    console.log('Bid accepted in parent page:', acceptedBid);
    // Potentially refresh order data here if BidList doesn't force a reload that updates it.
  };

  const handleBidRejected = (rejectedBidId: string) => {
    console.log('Bid rejected in parent page:', rejectedBidId);
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="mb-6">
        <a href="/dashboard/user/orders" className="text-blue-600 hover:underline">
          &larr; بازگشت به لیست سفارشات من
        </a>
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">جزئیات سفارش #{order.id.substring(0,8)}...</h1>

      {/* Display Order Details using a simplified version or OrderListItem */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
         <h2 className="text-xl font-semibold text-gray-700 mb-3">اطلاعات کلی سفارش</h2>
         <p><strong>وضعیت:</strong>
            <span className={`font-semibold ${
                order.status === 'pending_bids' ? 'text-yellow-600' :
                order.status === 'chef_selected' ? 'text-blue-600' :
                order.status === 'completed' ? 'text-green-600' :
                'text-gray-600'}`}>
                {/* Translate status */}
                {order.status === 'pending_bids' ? 'در انتظار پیشنهاد آشپزها' :
                 order.status === 'chef_selected' ? `آشپز انتخاب شد (${order.bids?.profiles?.full_name || 'نامشخص'})` :
                 order.status === 'completed' ? 'تکمیل شده' :
                 order.status}
            </span>
        </p>
        <p><strong>بودجه:</strong> {order.budget.toLocaleString('fa-IR')} تومان</p>
        <p><strong>تعداد نفرات:</strong> {order.number_of_people} نفر</p>
        {order.cuisine_type && <p><strong>نوع غذا:</strong> {order.cuisine_type}</p>}
        {order.dietary_restrictions && order.dietary_restrictions.length > 0 && (
          <p><strong>محدودیت‌های غذایی:</strong> {order.dietary_restrictions.join('، ')}</p>
        )}
        {order.description && <p className="mt-2"><strong>توضیحات شما:</strong> {order.description}</p>}
        <p className="text-xs text-gray-500 mt-3">تاریخ ثبت: {new Date(order.created_at).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Bids Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">پیشنهادات دریافت شده</h2>
        {order.status === 'pending_bids' || order.status === 'chef_selected' || bidsExistForOrder(order) ? (
          <BidList
            orderId={order.id}
            orderOwnerId={order.user_id}
            currentUserId={userProfile.id}
            currentOrderStatus={order.status}
            onBidAccepted={handleBidAccepted}
            onBidRejected={handleBidRejected}
          />
        ) : (
          <p className="text-gray-600 bg-gray-50 p-4 rounded-md">
            {order.status !== 'pending_bids' && order.status !== 'chef_selected' ? 'این سفارش دیگر در مرحله دریافت یا بررسی پیشنهاد نیست.' : 'هنوز هیچ پیشنهادی برای این سفارش ثبت نشده است.'}
          </p>
        )}
      </div>

      {/* Future sections: Chat with chef (if chef_selected), Payment, Delivery Tracking etc. */}
      {order.status === 'chef_selected' && order.bids && (
        <div className="mt-8 p-6 bg-green-50 border-l-4 border-green-500 rounded-lg">
            <h2 className="text-xl font-semibold text-green-700 mb-3">آشپز انتخاب شده</h2>
            <p><strong>نام آشپز:</strong> {order.bids.profiles?.full_name || 'نامشخص'}</p>
            <p><strong>مبلغ توافقی:</strong> {Number(order.final_bid_amount || order.bids.bid_amount).toLocaleString('fa-IR')} تومان</p>
            {/* Add link to chat with chef */}
        </div>
      )}

    </div>
  );
}

// Helper function to determine if bids might exist (simplistic check)
// A more robust check would be to see if the bids array from a join is populated or count bids
function bidsExistForOrder(order: OrderDetailItem): boolean {
    // This is a placeholder. The BidList component fetches bids itself.
    // This function is just to help decide if the BidList section should be rendered.
    // A better way would be if getOrderDetails also returned a count of bids or a flag.
    return true; // Assume bids might exist and let BidList handle empty state.
}
