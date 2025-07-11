'use client';

import React, { useEffect, useState, useCallback } from 'react';
import BidListItem, { BidItem } from './BidListItem';
import { createClient } from '@/lib/supabase/client'; // Supabase client for realtime

interface BidListProps {
  orderId: string;
  orderOwnerId: string; // ID of the user who created the order
  currentUserId: string; // ID of the currently logged-in user
  currentOrderStatus: string; // To determine if actions on bids are allowed
  onBidAccepted?: (acceptedBid: BidItem, updatedOrder: any) => void; // Callback with accepted bid and potentially updated order data
  onBidRejected?: (rejectedBidId: string) => void;
}

const BidList: React.FC<BidListProps> = ({
    orderId,
    orderOwnerId,
    currentUserId,
    currentOrderStatus,
    onBidAccepted,
    onBidRejected
}) => {
  const [bids, setBids] = useState<BidItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // To show loading on accept/reject buttons, stores bidId
  const supabase = createClient(); // Initialize Supabase client

  const isOrderOwner = currentUserId === orderOwnerId;

  const fetchBids = useCallback(async () => {
    // No setIsLoading(true) here if we rely on initial load or realtime updates mostly
    // setError(null); // Keep previous error until new data or error
    try {
      const response = await fetch(`/api/orders/${orderId}/bids`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در دریافت لیست پیشنهادات');
      }
      const data = await response.json();
      setBids(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(errorMessage);
      setBids([]);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchBids(); // Initial fetch

    // Supabase Realtime subscription for bids on this specific order
    const channel = supabase
      .channel(`bids-for-order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bids',
          filter: `order_id=eq.${orderId}` // Only for bids related to this order
        },
        (payload) => {
          console.log('Realtime bid change received!', payload);
          // Refetch bids to get the latest state including joined profile data
          // More sophisticated updates could involve merging payload.new or handling payload.eventType
          // For example, if payload.eventType === 'INSERT', add payload.new to bids state.
          // If payload.eventType === 'UPDATE', find and update the bid in state.
          // If payload.eventType === 'DELETE', remove bid from state.
          // However, refetching is simpler and ensures data consistency with joins.
          fetchBids();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to bids for order ${orderId}`);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Subscription error for order ${orderId}:`, err || status);
          setError(`خطا در اتصال به به‌روزرسانی‌های زنده. ${err?.message || ''}`);
        }
      });

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
      console.log(`Unsubscribed from bids for order ${orderId}`);
    };
  }, [fetchBids, orderId, supabase]);

  const handleBidAction = async (bidId: string, action: 'accepted' | 'rejected') => {
    if (!isOrderOwner) {
      alert('شما اجازه انجام این عملیات را ندارید.');
      return;
    }
    if (currentOrderStatus !== 'pending_bids') {
        alert('این سفارش دیگر در وضعیت انتخاب پیشنهاد نیست.');
        return;
    }

    setActionLoading(bidId); // Show loading on the specific bid item
    setError(null);

    try {
      const response = await fetch(`/api/bids/${bidId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: action }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `خطا در ${action === 'accepted' ? 'پذیرش' : 'رد'} پیشنهاد`);
      }

      // Successfully updated bid status
      alert(`پیشنهاد با موفقیت ${action === 'accepted' ? 'پذیرفته' : 'رد'} شد.`);

      // Option 1: Refetch all bids and order status (simple)
      // fetchBids();
      // if (onBidStatusChanged) onBidStatusChanged(); // Notify parent to refetch order details

      // Option 2: Update local state optimistically or based on response (more complex but better UX)
      if (action === 'accepted') {
        // The order status changes, other bids become rejected.
        // Parent component should ideally handle refreshing the entire order and its bids.
        if (onBidAccepted) {
            // The API for PATCH /api/bids/[bidId] when accepting should ideally return the updated order data or enough info
            // For now, we assume the accepted bid data is in result.data (the updated bid)
            // And we'd need a way to get the updated order.
            // For simplicity, the parent will refetch or the page will refresh.
            onBidAccepted(result.data as BidItem, result.updatedOrderData || null); // Pass updated order if API provides it
        }
        // Forcing a page reload to reflect all changes (order status, other bids rejected)
        window.location.reload();

      } else { // Rejected
        setBids(prevBids => prevBids.map(b => b.id === bidId ? { ...b, status: 'rejected' } : b));
        if (onBidRejected) {
            onBidRejected(bidId);
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(`خطا: ${errorMessage}`);
      alert(`خطا: ${errorMessage}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-5"><p>در حال بارگذاری پیشنهادات...</p></div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-center" role="alert">
        <p className="font-bold">خطا</p>
        <p>{error}</p>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="text-center py-5 bg-gray-50 rounded-lg p-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81a1.5 1.5 0 00-2.122-2.122z" />
        </svg>
        <p className="mt-2 text-gray-600">هنوز هیچ پیشنهادی برای این سفارش ثبت نشده است.</p>
        {currentOrderStatus === 'pending_bids' && <p className="text-xs text-gray-500 mt-1">به محض دریافت پیشنهاد، در اینجا نمایش داده خواهد شد.</p>}
      </div>
    );
  }

  // Separate accepted bid to display it prominently if it exists
  const acceptedBid = bids.find(bid => bid.status === 'accepted');
  const pendingBids = bids.filter(bid => bid.status === 'pending');
  const otherBids = bids.filter(bid => bid.status !== 'accepted' && bid.status !== 'pending');


  return (
    <div className="space-y-5">
      {isOrderOwner && currentOrderStatus === 'pending_bids' && pendingBids.length > 0 && (
        <h3 className="text-lg font-semibold text-gray-700 mt-2">پیشنهادات دریافتی (در انتظار بررسی):</h3>
      )}
      {isOrderOwner && acceptedBid && (
         <h3 className="text-lg font-semibold text-gray-700 mt-2">پیشنهاد پذیرفته شده:</h3>
      )}

      {acceptedBid && (
        <BidListItem
          key={acceptedBid.id}
          bid={acceptedBid}
          isOrderOwner={isOrderOwner}
          currentOrderStatus={currentOrderStatus}
          onAcceptBid={(bidId) => handleBidAction(bidId, 'accepted')}
          onRejectBid={(bidId) => handleBidAction(bidId, 'rejected')}
        />
      )}

      {/* Display pending bids only if no bid is accepted yet or if it's not the order owner viewing */}
      {(!acceptedBid || !isOrderOwner) && pendingBids.map((bid) => (
        <BidListItem
          key={bid.id}
          bid={bid}
          isOrderOwner={isOrderOwner}
          currentOrderStatus={currentOrderStatus}
          onAcceptBid={(bidId) => handleBidAction(bidId, 'accepted')}
          onRejectBid={(bidId) => handleBidAction(bidId, 'rejected')}
        />
      ))}

      {otherBids.length > 0 && (
        <>
          <h4 className="text-md font-semibold text-gray-600 pt-4 border-t mt-6">سایر پیشنهادات (رد شده/پس گرفته شده):</h4>
          {otherBids.map((bid) => (
            <BidListItem
              key={bid.id}
              bid={bid}
              isOrderOwner={isOrderOwner}
              currentOrderStatus={currentOrderStatus}
              onAcceptBid={(bidId) => handleBidAction(bidId, 'accepted')}
              onRejectBid={(bidId) => handleBidAction(bidId, 'rejected')}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default BidList;
