import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { MenuItemSchema, TMenuItemRequest } from '@/lib/validators/menu';
import { ZodError } from 'zod';

// GET: Fetch all menu items for the logged-in chef
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const chefProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!chefProfile || chefProfile.role !== 'chef') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. فقط آشپزها می‌توانند به منوی خود دسترسی داشته باشند.' }, { status: 403 });
  }
  // No need to check verification_status here, as they might want to manage menu even if pending review,
  // but cannot offer them publicly. Public API will check is_available & chef verification.

  const { searchParams } = new URL(request.url);
  const categoryFilter = searchParams.get('category');
  const availabilityFilter = searchParams.get('is_available'); // 'true' or 'false'

  try {
    let query = supabase
      .from('menu_items')
      .select('*') // Select all fields for chef's management view
      .eq('chef_id', chefProfile.id);

    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }
    if (availabilityFilter !== null && (availabilityFilter === 'true' || availabilityFilter === 'false')) {
      query = query.eq('is_available', availabilityFilter === 'true');
    }

    query = query.order('created_at', { ascending: false });

    const { data: menuItems, error } = await query;

    if (error) {
      console.error('Error fetching chef menu items:', error.message);
      return NextResponse.json({ message: 'خطا در دریافت آیتم‌های منو: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'آیتم‌های منو با موفقیت دریافت شدند.',
      data: menuItems || [],
    }, { status: 200 });

  } catch (err) {
    console.error('GET Chef Menu Items API - Generic error:', err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


// POST: Create a new menu item for the logged-in chef
export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const chefProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!chefProfile || chefProfile.role !== 'chef') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. فقط آشپزها می‌توانند آیتم منو ایجاد کنند.' }, { status: 403 });
  }
  if (chefProfile.verification_status !== 'approved') {
      return NextResponse.json({ message: 'حساب آشپزی شما برای افزودن آیتم به منو باید تأیید شده باشد.' }, { status: 403 });
  }

  let validatedRequestBody: TMenuItemRequest;
  try {
    const body = await request.json();
    validatedRequestBody = MenuItemSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'اطلاعات ارسال شده برای آیتم منو نامعتبر است.', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  try {
    const newItemPayload = {
      ...validatedRequestBody,
      chef_id: chefProfile.id, // Set the chef_id from the logged-in user
    };

    const { data: newMenuItem, error: insertError } = await supabase
      .from('menu_items')
      .insert(newItemPayload)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating menu item:', insertError);
      // Handle specific errors like RLS violation or unique constraints if any
      return NextResponse.json({ message: 'خطا در ایجاد آیتم منو: ' + insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'آیتم منو با موفقیت ایجاد شد.',
      data: newMenuItem,
    }, { status: 201 });

  } catch (error) {
    console.error('POST Chef Menu Item API - Generic error:', error);
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
