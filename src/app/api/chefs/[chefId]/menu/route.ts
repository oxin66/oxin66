import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Using server client for public data access
import { cookies } from 'next/headers'; // Needed for createClient

interface ChefMenuRouteParams {
  params: {
    chefId: string;
  };
}

// GET: Fetch public and available menu items for a specific chef
export async function GET(request: NextRequest, { params }: ChefMenuRouteParams) {
  const { chefId } = params;
  if (!chefId) {
    return NextResponse.json({ message: 'شناسه آشپز الزامی است.' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const categoryFilter = searchParams.get('category');
  // Pagination can be added here if needed for very long menus
  // const page = parseInt(searchParams.get('page') || '1', 10);
  // const limit = parseInt(searchParams.get('limit') || '50', 10); // Default 50 items, maybe all for public menu
  // const offset = (page - 1) * limit;


  // No specific user authentication is strictly needed for public menu,
  // but createClient needs cookieStore.
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // 1. Optional: Verify the chefId corresponds to an actual, approved chef profile
    const { data: chefProfile, error: chefError } = await supabase
      .from('profiles')
      .select('id, role, verification_status, account_status')
      .eq('id', chefId)
      .eq('role', 'chef')
      .single();

    if (chefError || !chefProfile) {
      return NextResponse.json({ message: 'آشپز مورد نظر یافت نشد.' }, { status: 404 });
    }
    // Only show menu if chef is approved and active
    if (chefProfile.verification_status !== 'approved' || chefProfile.account_status !== 'active') {
      return NextResponse.json({ message: 'منوی این آشپز در حال حاضر در دسترس نیست.' }, { status: 403 });
    }

    // 2. Fetch publicly available menu items for the chef
    let query = supabase
      .from('menu_items')
      .select('*') // Select all fields for public display
      .eq('chef_id', chefId)
      .eq('is_available', true); // Only fetch available items

    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }

    // Order by a 'priority' field if you have one, then by name or created_at
    // query = query.order('priority', { ascending: true }).order('name', { ascending: true });
    query = query.order('created_at', { ascending: true }); // Older items first, or as desired
    // query = query.range(offset, offset + limit -1); // If pagination is added

    const { data: menuItems, error: menuItemsError } = await query;

    if (menuItemsError) {
      console.error(`Error fetching menu for chef ${chefId}:`, menuItemsError.message);
      return NextResponse.json({ message: 'خطا در دریافت منوی آشپز: ' + menuItemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'منوی آشپز با موفقیت دریافت شد.',
      data: menuItems || [],
      // pagination: { /* ... if pagination is added ... */ }
    }, { status: 200 });

  } catch (err) {
    console.error(`GET Chef Public Menu API - Generic error for chef ${chefId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
