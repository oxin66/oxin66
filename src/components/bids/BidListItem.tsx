import React from 'react';

// Align with the bid data structure returned by /api/orders/[orderId]/bids GET endpoint
export interface BidChefProfile {
  full_name: string | null;
  avatar_url?: string | null;
  // Add other chef profile data like average_rating if available
}

export interface BidItem {
  id: string;
  order_id: string;
  chef_id: string;
  bid_amount: number;
  estimated_delivery_time_minutes?: number | null;
  chef_notes?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn_by_chef' | 'expired';
  created_at: string;
  profiles: BidChefProfile | null; // Chef's profile info
}

interface BidListItemProps {
  bid: BidItem;
  isOrderOwner: boolean; // Is the current user the owner of the order?
  currentOrderStatus: string; // e.g., 'pending_bids', 'chef_selected'
  onAcceptBid: (bidId: string) => void;
  onRejectBid: (bidId: string) => void;
  // onWithdrawBid: (bidId: string) => void; // If chef is viewing their own bids in a list
  // isBidOwner: boolean; // If the current user is the chef who made this bid
}

const BidListItem: React.FC<BidListItemProps> = ({
    bid,
    isOrderOwner,
    currentOrderStatus,
    onAcceptBid,
    onRejectBid
}) => {
  const formattedDate = new Date(bid.created_at).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const canTakeAction = isOrderOwner && bid.status === 'pending' && currentOrderStatus === 'pending_bids';

  return (
    <div
      className={`bg-white shadow rounded-lg p-5 mb-4 border-l-4 ${
        bid.status === 'accepted' ? 'border-green-500' :
        bid.status === 'rejected' ? 'border-red-500' :
        bid.status === 'withdrawn_by_chef' ? 'border-gray-400' :
        'border-blue-500' // pending
      }`}
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
        <div className="mb-2 sm:mb-0">
            <h4 className="text-lg font-semibold text-gray-800">
                پیشنهاد از: {bid.profiles?.full_name || 'آشپز ناشناس'}
            </h4>
            {bid.profiles?.avatar_url && (
                <img src={bid.profiles.avatar_url} alt={bid.profiles.full_name || 'avatar'} className="w-10 h-10 rounded-full object-cover inline-block ml-2"/>
            )}
            {/* Future: Display chef's rating here */}
            {/* <span className="text-sm text-yellow-500">★★★★☆ (۴.۵)</span> */}
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full text-white ${
          bid.status === 'pending' ? 'bg-blue-500' :
          bid.status === 'accepted' ? 'bg-green-500' :
          bid.status === 'rejected' ? 'bg-red-500' :
          bid.status === 'withdrawn_by_chef' ? 'bg-gray-500' :
          'bg-yellow-500' // expired or other
        }`}>
          {bid.status === 'pending' ? 'در انتظار بررسی' :
           bid.status === 'accepted' ? 'پذیرفته شده' :
           bid.status === 'rejected' ? 'رد شده' :
           bid.status === 'withdrawn_by_chef' ? 'پس گرفته شده توسط آشپز' :
           bid.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-700">
        <p><strong>مبلغ پیشنهادی:</strong> {bid.bid_amount.toLocaleString('fa-IR')} تومان</p>
        {bid.estimated_delivery_time_minutes && (
          <p><strong>زمان تخمینی تحویل:</strong> {bid.estimated_delivery_time_minutes} دقیقه</p>
        )}
      </div>

      {bid.chef_notes && (
        <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          <strong>یادداشت آشپز:</strong> {bid.chef_notes}
        </p>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center">
        <p className="text-xs text-gray-500 mb-2 sm:mb-0">تاریخ ارسال پیشنهاد: {formattedDate}</p>
        {canTakeAction && (
          <div className="flex space-x-2 space-x-reverse">
            <button
              onClick={() => onAcceptBid(bid.id)}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors duration-150"
            >
              پذیرش پیشنهاد
            </button>
            <button
              onClick={() => onRejectBid(bid.id)}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-lg text-sm transition-colors duration-150"
            >
              رد پیشنهاد
            </button>
          </div>
        )}
         {bid.status === 'accepted' && isOrderOwner && (
            <p className="text-sm font-semibold text-green-600">این پیشنهاد توسط شما پذیرفته شده است.</p>
        )}
      </div>
    </div>
  );
};

export default BidListItem;
