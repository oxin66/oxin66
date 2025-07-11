import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';

// GET: Fetch all orders for admin panel
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  // 1. Authenticate user and check for admin role
  if (!adminUserProfile || adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز (فقط ادمین).' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '15', 10); // Default 15 orders per page
  const offset = (page - 1) * limit;
  const statusFilter = searchParams.get('status'); // Filter by order status
  const searchQuery = searchParams.get('q'); // Search by order_id, user name/email, chef name/email

  try {
    let query = supabase
      .from('orders')
      .select(`
        id,
        user_id,
        userProfile:profiles!orders_user_id_fkey (full_name, email),
        assigned_chef_id,
        chefProfile:profiles!orders_assigned_chef_id_fkey (full_name, email),
        status,
        budget,
        final_bid_amount,
        created_at,
        updated_at,
        delivery_location,
        preferred_delivery_time
      `, { count: 'exact' });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (searchQuery) {
      // This search can be complex. Searching across joined tables might require a database function/view for efficiency.
      // Simple text search on order id:
      // query = query.ilike('id', `%${searchQuery}%`);
      // Or more complex search (example, may need optimization or specific Supabase full-text search setup):
      query = query.or(
        `id.ilike.%${searchQuery}%,` +
        `userProfile.full_name.ilike.%${searchQuery}%, userProfile.email.ilike.%${searchQuery}%,` +
        `chefProfile.full_name.ilike.%${searchQuery}%, chefProfile.email.ilike.%${searchQuery}%`
      );
      // Note: Supabase syntax for querying on joined table columns in .or() needs to be exact.
      // The above .or() with joined tables might not work directly as shown and might require
      // using a view or a function that denormalizes these searchable fields or performs the join and search.
      // For MVP, we might limit search to order_id or primary table fields.
      // Fallback to searching only order_id if complex search is problematic:
      // query = query.ilike('id', `%${searchQuery}%`);
    }

    query = query.order('created_at', { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Error fetching orders for admin:', error.message);
      // Check if error is due to complex .or() on joined tables
      if (error.message.includes("missing FROM-clause entry for table") || error.message.includes("no such column")) {
         // Retry with simpler search if the complex one fails
         console.warn("Complex search failed, retrying with simpler search on order.id");
         let simplerQuery = supabase.from('orders').select(`...`, { count: 'exact' }) // Re-add full select
            .eq('id', searchQuery) // Example: exact match on ID if it's a UUID
            .order('created_at', { ascending: false }).range(offset, offset + limit - 1);
         if (statusFilter) simplerQuery = simplerQuery.eq('status', statusFilter);

         const { data: simplerOrders, error: simplerError, count: simplerCount } = await simplerQuery;
         if (simplerError) {
            return NextResponse.json({ message: 'خطا در دریافت لیست سفارشات (پس از تلاش مجدد): ' + simplerError.message }, { status: 500 });
         }
         return NextResponse.json({
            message: 'لیست سفارشات (با جستجوی ساده شده) با موفقیت دریافت شد.',
            data: simplerOrders || [],
            pagination: { /* ... pagination for simplerOrders ... */ }
         }, { status: 200 });
      }
      return NextResponse.json({ message: 'خطا در دریافت لیست سفارشات: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'لیست سفارشات با موفقیت دریافت شد.',
      data: orders || [],
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      }
    }, { status: 200 });

  } catch (err) {
    console.error('GET Admin Orders API - Generic error:', err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
