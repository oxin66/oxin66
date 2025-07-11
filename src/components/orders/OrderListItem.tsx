import React from 'react';

// Define a type for the order object based on what API returns
// This should align with the select query in your GET /api/orders route
export interface OrderProfile {
  full_name: string | null;
  avatar_url?: string | null;
}
export interface OrderItem {
  id: string;
  budget: number;
  number_of_people: number;
  cuisine_type?: string | null;
  dietary_restrictions?: string[] | null;
  description?: string | null;
  status: string;
  created_at: string; // Assuming ISO string format
  user_id: string;
  profiles: OrderProfile | null; // Joined profile data
}

interface OrderListItemProps {
  order: OrderItem;
  userRole: 'user' | 'chef' | 'admin' | null; // To customize actions/display based on role
  onSelectOrder?: (orderId: string) => void; // For chef to select an order to bid on, or user to view details
}

const OrderListItem: React.FC<OrderListItemProps> = ({ order, userRole, onSelectOrder }) => {
  const formattedDate = new Date(order.created_at).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleItemClick = () => {
    if (onSelectOrder) {
      onSelectOrder(order.id);
    }
  };

  // Determine what to display based on role
  const canBid = userRole === 'chef' && order.status === 'pending_bids';
  // const canViewDetails = userRole === 'user' || userRole === 'admin' || (userRole === 'chef' && order.status !== 'pending_bids');

  return (
    <div
      className={`bg-white shadow-md rounded-lg p-6 mb-4 border-l-4 ${order.status === 'pending_bids' ? 'border-yellow-500' : 'border-gray-300'} hover:shadow-lg transition-shadow duration-200 ease-in-out cursor-pointer`}
      onClick={handleItemClick}
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
        <h3 className="text-xl font-semibold text-blue-600 mb-2 sm:mb-0">
          سفارش #{order.id.substring(0, 8)}...
          {userRole === 'chef' && order.profiles?.full_name && (
            <span className="text-sm text-gray-500 font-normal ml-2">(سفارش دهنده: {order.profiles.full_name})</span>
          )}
        </h3>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full text-white ${
          order.status === 'pending_bids' ? 'bg-yellow-500' :
          order.status === 'chef_selected' ? 'bg-blue-500' :
          order.status === 'completed' ? 'bg-green-500' :
          order.status === 'cancelled_by_user' || order.status === 'cancelled_by_chef' ? 'bg-red-500' :
          'bg-gray-500'
        }`}>
          {/* TODO: Translate status to Persian */}
          {order.status === 'pending_bids' ? 'در انتظار پیشنهاد' :
           order.status === 'chef_selected' ? 'آشپز انتخاب شد' :
           order.status === 'in_preparation' ? 'در حال آماده‌سازی' :
           order.status === 'ready_for_delivery' ? 'آماده تحویل' :
           order.status === 'out_for_delivery' ? 'ارسال شده' :
           order.status === 'delivered' ? 'تحویل داده شد' :
           order.status === 'completed' ? 'تکمیل شده' :
           order.status === 'cancelled_by_user' ? 'لغو توسط کاربر' :
           order.status === 'cancelled_by_chef' ? 'لغو توسط آشپز' :
           order.status === 'disputed' ? 'مورد اختلاف' :
           order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm text-gray-700">
        <p><strong>بودجه:</strong> {order.budget.toLocaleString('fa-IR')} تومان</p>
        <p><strong>تعداد نفرات:</strong> {order.number_of_people} نفر</p>
        {order.cuisine_type && <p><strong>نوع غذا:</strong> {order.cuisine_type}</p>}
        {order.dietary_restrictions && order.dietary_restrictions.length > 0 && (
          <p><strong>محدودیت‌های غذایی:</strong> {order.dietary_restrictions.join('، ')}</p>
        )}
      </div>

      {order.description && (
        <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          <strong>توضیحات:</strong> {order.description}
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
        <p className="text-xs text-gray-500">تاریخ ثبت: {formattedDate}</p>
        {canBid && (
          <button
            onClick={(e) => { e.stopPropagation(); handleItemClick(); }} // Prevent div click if button is clicked
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors duration-150"
          >
            ارسال پیشنهاد
          </button>
        )}
        {/* Add other actions based on role and status, e.g., "View Details", "Cancel Order" */}
      </div>
    </div>
  );
};

export default OrderListItem;
