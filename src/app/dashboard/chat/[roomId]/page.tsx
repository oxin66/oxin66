import ChatWindow from '@/components/chat/ChatWindow';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server'; // To fetch other participant's name
import Link from 'next/link';

interface ChatRoomPageProps {
  params: { roomId: string };
}

// Function to get basic room info and determine the other participant
async function getChatRoomDetails(roomId: string, currentUserId: string, supabaseClient: any) {
  const { data: roomData, error } = await supabaseClient
    .from('chat_rooms')
    .select(`
      id,
      user_id,
      chef_id,
      order_id,
      userProfile:profiles!chat_rooms_user_id_fkey(full_name),
      chefProfile:profiles!chat_rooms_chef_id_fkey(full_name),
      orders(id, status)
    `)
    .eq('id', roomId)
    .or(`user_id.eq.${currentUserId},chef_id.eq.${currentUserId}`) // Ensure current user is part of this room
    .single();

  if (error || !roomData) {
    console.error('Error fetching chat room details or not a participant:', error?.message);
    return null;
  }

  const otherParticipant = currentUserId === roomData.user_id ? roomData.chefProfile : roomData.userProfile;
  const orderLink = currentUserId === roomData.user_id ? `/dashboard/user/orders/${roomData.order_id}` : `/dashboard/chef/orders/${roomData.order_id}`;


  return {
    roomId: roomData.id,
    orderId: roomData.order_id,
    orderStatus: roomData.orders?.status,
    orderLink,
    otherParticipantName: otherParticipant?.full_name || 'طرف مقابل',
  };
}


export default async function ChatRoomPage({ params }: ChatRoomPageProps) {
  const { roomId } = params;
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    redirect('/login?message=لطفا برای دسترسی به چت وارد شوید');
  }

  const roomDetails = await getChatRoomDetails(roomId, userProfile.id, supabase);

  if (!roomDetails) {
     return (
      <div className="container mx-auto px-4 py-8 text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-red-600 mb-4">خطا</h1>
        <p className="text-gray-700">اتاق چت مورد نظر یافت نشد یا شما اجازه دسترسی به آن را ندارید.</p>
        <Link href="/dashboard/chat" className="mt-4 inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded">
          بازگشت به لیست گفتگوها
        </Link>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-0 sm:px-4 py-4 sm:py-8 h-full flex flex-col" dir="rtl">
       <div className="mb-4 px-4 sm:px-0">
        <Link href="/dashboard/chat" className="text-sm text-blue-600 hover:underline">
          &larr; بازگشت به لیست گفتگوها
        </Link>
        {roomDetails.orderId && (
             <Link href={roomDetails.orderLink} className="text-sm text-blue-600 hover:underline mr-4">
                (مشاهده سفارش مربوطه #{roomDetails.orderId.substring(0,8)}...)
             </Link>
        )}
      </div>
      <ChatWindow
        roomId={roomId}
        currentUser={userProfile}
        otherParticipantName={roomDetails.otherParticipantName}
      />
    </div>
  );
}
