import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Server client for Supabase
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils'; // To get current user
import { cookies } from 'next/headers';
import { ZodError, z } from 'zod';

// Zod schema for validating the order data on the server
const OrderCreationSchema = z.object({
  budget: z.number().positive({ message: 'بودجه باید بیشتر از صفر باشد.' }),
  numberOfPeople: z.number().int().positive({ message: 'تعداد نفرات باید حداقل ۱ نفر باشد.' }),
  cuisineType: z.string().optional().nullable(),
  dietaryRestrictions: z.array(z.string()).optional().nullable(),
  description: z.string().optional().nullable(),
  // deliveryLocation and preferredDeliveryTime can be added later
});

type OrderCreationRequest = z.infer<typeof OrderCreationSchema>;

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Authenticate user and get their profile
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  if (userProfile.role !== 'user' && userProfile.role !== 'admin') {
    return NextResponse.json({ message: 'شما اجازه ایجاد سفارش را ندارید.' }, { status: 403 });
  }

  // 2. Parse and validate the request body
  let validatedData: OrderCreationRequest;
  try {
    const body = await request.json();
    validatedData = OrderCreationSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      // Convert Zod errors to a more user-friendly format
      const formattedErrors = error.errors.reduce((acc, curr) => {
        acc[curr.path.join('.')] = curr.message;
        return acc;
      }, {} as Record<string, string>);
      return NextResponse.json({ message: 'اطلاعات وارد شده نامعتبر است.', errors: formattedErrors }, { status: 400 });
    }
    console.error('Order API - JSON parsing error:', error);
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  // 3. Insert the order into the database
  try {
    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: userProfile.id, // Set the user_id from the authenticated user
        budget: validatedData.budget,
        number_of_people: validatedData.numberOfPeople,
        cuisine_type: validatedData.cuisineType,
        dietary_restrictions: validatedData.dietaryRestrictions,
        description: validatedData.description,
        status: 'pending_bids', // Default status for new orders
        // delivery_location and preferred_delivery_time will be null by default if not provided
      })
      .select('id, created_at, status') // Select some fields from the newly created order to return
      .single(); // Expect a single row to be returned

    if (insertError) {
      console.error('Supabase order insert error:', insertError);
      // Check for specific errors, e.g., RLS violation, foreign key constraint
      if (insertError.code === '23503') { // Foreign key violation (e.g. user_id not in profiles)
          return NextResponse.json({ message: 'خطا در ارتباط با حساب کاربری شما. لطفاً دوباره وارد شوید.' }, { status: 400 });
      }
      if (insertError.code === '23514') { // Check constraint violation (e.g. budget <= 0)
          return NextResponse.json({ message: 'مقادیر وارد شده برای سفارش معتبر نیستند (مانند بودجه منفی).' }, { status: 400 });
      }
      return NextResponse.json({ message: 'خطا در ذخیره سازی سفارش در پایگاه داده: ' + insertError.message }, { status: 500 });
    }

    if (!newOrder) {
        console.error('Order API - New order data is null despite no insert error.');
        return NextResponse.json({ message: 'سفارش ایجاد شد اما اطلاعات آن بازگردانده نشد.' }, { status: 500 });
    }

    return NextResponse.json({
        message: 'سفارش شما با موفقیت ثبت شد و در انتظار پیشنهادات آشپزها می‌باشد.',
        orderId: newOrder.id,
        order: newOrder
    }, { status: 201 });

  } catch (error) {
    console.error('Order API - Generic error:', error);
    return NextResponse.json({ message: 'یک خطای پیش بینی نشده در سرور رخ داد.' }, { status: 500 });
  }
}

// TODO: Implement GET handler for fetching user's orders (for user dashboard)
// and for chefs to see pending_bids orders (for chef dashboard) in a later step.

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { searchParams } = new URL(request.url);

  // 1. Authenticate user and get their profile
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  try {
    let query = supabase.from('orders').select(`
      id,
      budget,
      number_of_people,
      cuisine_type,
      dietary_restrictions,
      description,
      status,
      created_at,
      user_id,
      profiles (  -- Join with profiles table to get user's full_name
        full_name,
        avatar_url
      )
    `);

    // Filter based on user role and viewMode
    const viewMode = searchParams.get('viewMode');
    const statusFilter = searchParams.get('status');

    if (userProfile.role === 'user') {
      // Users see their own created orders
      query = query.eq('user_id', userProfile.id);
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }
    } else if (userProfile.role === 'chef' || userProfile.role === 'admin') {
      if (viewMode === 'chef_active') {
        // Chefs/Admins viewing chef's active/assigned orders
        query = query.eq('assigned_chef_id', userProfile.id);
        if (statusFilter) {
          // statusFilter can be a comma-separated list like "in_preparation,ready_for_delivery"
          const statuses = statusFilter.split(',').map(s => s.trim()).filter(s => s);
          if (statuses.length > 0) {
            query = query.in('status', statuses);
          }
        } else {
          // Default active statuses for a chef if not specified
          query = query.in('status', ['in_preparation', 'ready_for_delivery', 'out_for_delivery']);
        }
      } else {
        // Default view for Chefs/Admins: orders pending bids (for bidding market)
        // Admins might have other views too, handled by specific admin APIs or more params
        if (statusFilter) {
          query = query.eq('status', statusFilter);
        } else {
          query = query.eq('status', 'pending_bids');
        }
        // For 'pending_bids', a chef should not see their own order requests if they also act as a user.
        // query = query.neq('user_id', userProfile.id);
      }
    } else {
      return NextResponse.json({ message: 'نقش کاربری نامعتبر برای مشاهده سفارشات.' }, { status: 403 });
    }

    // Ordering
    if (viewMode === 'chef_active') {
        query = query.order('updated_at', { ascending: false }); // Show most recently updated active orders first
    } else {
        query = query.order('created_at', { ascending: false }); // Default: newest created orders first
    }

    // Pagination (example, can be extended)
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Supabase GET orders error:', error);
      return NextResponse.json({ message: 'خطا در دریافت لیست سفارشات: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'لیست سفارشات با موفقیت دریافت شد.',
      data: orders,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: count, // Supabase returns total count in 'count' when { count: 'exact' } is used with query
        totalPages: count ? Math.ceil(count / limit) : 0,
      }
    }, { status: 200 });

  } catch (err) {
    console.error('GET Orders API - Generic error:', err);
    // Type guard for error
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
