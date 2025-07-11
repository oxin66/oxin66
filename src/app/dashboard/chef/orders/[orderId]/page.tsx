// Page for chef to view a specific order and submit a bid
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SubmitBidForm from '@/components/bids/SubmitBidForm';
// import OrderListItem, { OrderItem as OrderDetailItem } from '@/components/orders/OrderListItem'; // Can reuse if needed for display

interface ChefOrderDetailsPageProps {
  params: { orderId: string };
}

// Define a more specific type for order details shown to chef
interface OrderForChef {
  id: string;
  budget: number;
  number_of_people: number;
  cuisine_type?: string | null;
  dietary_restrictions?: string[] | null;
  description?: string | null;
  status: string;
  created_at: string;
  user_id: string; // ID of the user who created the order
  // Info about the user who placed the order (optional, based on privacy)
  profiles?: {
    full_name?: string | null; // User's name
    // avatar_url?: string | null; // User's avatar
    // Consider what chef needs to see about the user vs. privacy
  } | null;
  // Info about any existing bid by the current chef for this order
  my_bid?: {
    id: string;
    bid_amount: number;
    estimated_delivery_time_minutes?: number | null;
    chef_notes?: string | null;
    status: string; // 'pending', 'withdrawn_by_chef', 'accepted', 'rejected'
  }[] | null; // Array because Supabase join might return array
}


async function getOrderForChef(orderId: string, supabaseClient: any, currentChefId: string): Promise<OrderForChef | null> {
  const { data, error } = await supabaseClient
    .from('orders')
    .select(`
        *,
        profiles!orders_user_id_fkey (full_name),
        my_bid:bids!bids_order_id_fkey (
            id,
            bid_amount,
            estimated_delivery_time_minutes,
            chef_notes,
            status
        ),
        chat_rooms!order_id (id) -- Join to get chat room ID
    `)
    .eq('id', orderId)
    // .eq('status', 'pending_bids') // Chef should only be able to bid on pending_bids orders
    // We'll check status in the component to show appropriate messages if not pending_bids
    .eq('my_bid.chef_id', currentChefId) // Filter the joined 'my_bid' to only the current chef's bid
    .single();

  if (error) {
    console.error('Error fetching order details for chef:', error.message);
    return null;
  }

  // The 'my_bid' might be an empty array if no bid, or array with one item. Normalize to single object or null.
  const orderData = data as any;
  if (orderData && orderData.my_bid && orderData.my_bid.length > 0) {
    orderData.my_bid = orderData.my_bid[0];
  } else if (orderData) {
    orderData.my_bid = null;
  }
  if (orderData && orderData.chat_rooms && Array.isArray(orderData.chat_rooms)) {
    orderData.chat_rooms = orderData.chat_rooms[0] || null;
  }

  return orderData as (OrderForChef & { chat_rooms: { id: string } | null });
}

export default async function ChefOrderDetailsPage({ params }: ChefOrderDetailsPageProps) {
  const { orderId } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    redirect('/login?message=لطفا برای مشاهده جزئیات سفارش وارد شوید');
  }
  if (userProfile.role !== 'chef' && userProfile.role !== 'admin') {
    redirect('/?error=unauthorized_action');
  }

  const order = await getOrderForChef(orderId, supabase, userProfile.id) as (OrderForChef & { chat_rooms: { id: string } | null });

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8 text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-red-600 mb-4">خطا</h1>
        <p className="text-gray-700">سفارش مورد نظر یافت نشد یا خطایی در دسترسی به آن رخ داد.</p>
        <a href="/dashboard/chef/orders" className="mt-4 inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded">
          بازگشت به لیست سفارشات
        </a>
      </div>
    );
  }

  const handleBidSubmitted = (bidData: any) => {
    console.log('Bid submitted from details page:', bidData);
    // For better UX, might want to update the UI to show the submitted bid or a success message
    // instead of just an alert. Or redirect.
    // For now, SubmitBidForm shows an alert. A page refresh might be needed to see 'my_bid' updated.
    // A redirect or router.refresh() could be useful here.
    // router.refresh(); // from next/navigation
    window.location.reload(); // Simple refresh for now
  };

  // Determine if the chef can currently submit a bid
  const isChefApproved = userProfile?.verification_status === 'approved';
  const canSubmitBid = isChefApproved && order.status === 'pending_bids' && (!order.my_bid || order.my_bid.status === 'withdrawn_by_chef' || order.my_bid.status === 'rejected');
  const hasActivePendingBid = order.my_bid && order.my_bid.status === 'pending';
  const hasAcceptedBid = order.my_bid && order.my_bid.status === 'accepted';


  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="mb-6">
        <a href="/dashboard/chef/orders" className="text-blue-600 hover:underline">
          &larr; بازگشت به لیست سفارشات در انتظار پیشنهاد
        </a>
      </div>

      <h1 className="text-3xl font-bold text-gray-800 mb-6">جزئیات سفارش #{order.id.substring(0,8)}... (برای آشپز)</h1>

      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">اطلاعات کلی سفارش</h2>
        <p><strong>وضعیت سفارش:</strong>
            <span className={`font-semibold ${
                order.status === 'pending_bids' ? 'text-yellow-600' :
                order.status === 'chef_selected' ? 'text-blue-600' :
                'text-gray-600'}`}>
                {order.status === 'pending_bids' ? 'در انتظار پیشنهاد' :
                 order.status === 'chef_selected' ? 'آشپز انتخاب شده' :
                 order.status}
            </span>
        </p>
        <p><strong>بودجه کاربر:</strong> {order.budget.toLocaleString('fa-IR')} تومان</p>
        <p><strong>تعداد نفرات:</strong> {order.number_of_people} نفر</p>
        {order.cuisine_type && <p><strong>نوع غذا:</strong> {order.cuisine_type}</p>}
        {order.dietary_restrictions && order.dietary_restrictions.length > 0 && (
          <p><strong>محدودیت‌های غذایی:</strong> {order.dietary_restrictions.join('، ')}</p>
        )}
        {order.description && <p className="mt-2"><strong>توضیحات کاربر:</strong> {order.description}</p>}
        {order.profiles?.full_name && <p className="text-sm text-gray-600 mt-1">سفارش دهنده: {order.profiles.full_name}</p>}
        <p className="text-xs text-gray-500 mt-3">تاریخ ثبت: {new Date(order.created_at).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Bid Submission Section or Existing Bid Info */}
      <div className="mt-8">
        {order.status === 'pending_bids' && (
          <>
            {hasActivePendingBid && order.my_bid && (
              <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md mb-6">
                <p className="font-bold">شما یک پیشنهاد در انتظار برای این سفارش دارید:</p>
                <p>مبلغ: {Number(order.my_bid.bid_amount).toLocaleString('fa-IR')} تومان</p>
                {order.my_bid.estimated_delivery_time_minutes && <p>زمان تخمینی: {order.my_bid.estimated_delivery_time_minutes} دقیقه</p>}
                {order.my_bid.chef_notes && <p>یادداشت شما: {order.my_bid.chef_notes}</p>}
                <button
                  onClick={async () => {
                    if (!order.my_bid) return;
                    if (confirm('آیا از پس گرفتن این پیشنهاد مطمئن هستید؟')) {
                      try {
                        const response = await fetch(`/api/bids/${order.my_bid.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'withdrawn_by_chef' }),
                        });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message || 'خطا در پس گرفتن پیشنهاد');
                        alert('پیشنهاد شما با موفقیت پس گرفته شد.');
                        window.location.reload(); // Refresh to update UI
                      } catch (err) {
                        alert((err as Error).message);
                        console.error(err);
                      }
                    }
                  }}
                  className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors duration-150"
                >
                  پس گرفتن پیشنهاد
                </button>
              </div>
            )}
            {hasAcceptedBid && order.my_bid && (
                 <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-6">
                    <p className="font-bold">تبریک! پیشنهاد شما برای این سفارش پذیرفته شده است.</p>
                    <p>مبلغ: {Number(order.my_bid.bid_amount).toLocaleString('fa-IR')} تومان</p>
                    {(order.chat_rooms as {id: string} | null)?.id && (
                        <div className="mt-3">
                            <Link
                                href={`/dashboard/chat/${(order.chat_rooms as {id: string}).id}`}
                                className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg text-sm"
                            >
                                مشاهده گفتگو با کاربر
                            </Link>
                        </div>
                    )}
                 </div>
            )}
            {canSubmitBid && (
              <SubmitBidForm
                orderId={order.id}
                chefId={userProfile.id}
                onBidSubmitted={handleBidSubmitted}
                // Pass existing bid details if chef is resubmitting a withdrawn/rejected one (logic needs to be enhanced for this)
                // existingBid={order.my_bid?.status === 'withdrawn_by_chef' ? order.my_bid : undefined}
              />
            )}
            {/* Show message if chef is not approved but order is biddable */}
            {!isChefApproved && order.status === 'pending_bids' && (
                 <div className="bg-orange-50 border-l-4 border-orange-500 text-orange-700 p-4 rounded-md mb-6">
                    <p className="font-bold">عدم امکان ارسال پیشنهاد</p>
                    <p>حساب کاربری آشپزی شما هنوز توسط ادمین تأیید نشده است. پس از تأیید، قادر به ارسال پیشنهاد برای این سفارش خواهید بود.</p>
                 </div>
            )}
            {!canSubmitBid && !hasActivePendingBid && !hasAcceptedBid && order.status === 'pending_bids' && isChefApproved && (
                 <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md mb-6">
                    <p className="font-bold">توجه</p>
                    <p>شما قبلاً برای این سفارش پیشنهادی ارسال کرده‌اید که یا پذیرفته شده یا وضعیت دیگری دارد. در حال حاضر نمی‌توانید پیشنهاد جدیدی ثبت کنید (مگر اینکه پیشنهاد قبلی پس گرفته یا رد شده باشد).</p>
                 </div>
            )}
          </>
        )}
        {order.status !== 'pending_bids' && (
          <p className="text-gray-700 bg-gray-100 p-4 rounded-md">
            این سفارش دیگر در وضعیت "در انتظار پیشنهاد" نیست.
            {order.status === 'chef_selected' && order.assigned_chef_id === userProfile.id && " (تبریک! پیشنهاد شما پذیرفته شده است.)"}
            {order.status === 'chef_selected' && order.assigned_chef_id !== userProfile.id && " (آشپز دیگری برای این سفارش انتخاب شده است.)"}
          </p>
        )}
      </div>
    </div>
  );
}
