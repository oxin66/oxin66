import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';

// GET: Fetch all users (profiles) for admin panel
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  // 1. Authenticate user and check for admin role
  if (!adminUserProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }
  if (adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'شما اجازه دسترسی به این اطلاعات را ندارید (فقط ادمین).' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;
  const roleFilter = searchParams.get('role'); // Filter by user role
  const statusFilter = searchParams.get('status'); // Filter by account_status
  const verificationFilter = searchParams.get('verification'); // Filter by verification_status (for chefs)
  const searchQuery = searchParams.get('q'); // Search by name or email

  try {
    // It's often better to join with auth.users to get the email directly,
    // as profiles.email might not be populated or could be out of sync.
    // However, for simplicity, if email is reliably in profiles, we use that.
    // For this example, we assume profiles table has an email field that is kept in sync.
    // If not, a join or separate query to auth.users would be needed.
    // To get auth.users.email, you would typically do a join if possible, or fetch profiles then map and fetch auth data.
    // Supabase client library doesn't directly support joins in the same way as raw SQL for auth.users table.
    // Let's assume `profiles` table contains an `email` column for simplicity of this query.
    // If `profiles.email` is not available/reliable, this query needs adjustment or a function call.

    let query = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone_number,
        avatar_url,
        role,
        verification_status,
        account_status,
        created_at,
        updated_at
        -- To get auth.users.email, you might need a view or a function in Supabase
        -- or fetch auth.users separately if not denormalized into profiles.
        -- For now, assuming 'email' field exists and is populated in 'profiles'.
      `, { count: 'exact' });

    if (roleFilter) {
      query = query.eq('role', roleFilter);
    }
    if (statusFilter) {
      query = query.eq('account_status', statusFilter);
    }
    if (verificationFilter && roleFilter === 'chef') { // Makes sense mostly for chefs
        query = query.eq('verification_status', verificationFilter);
    }
    if (searchQuery) {
      // Assuming 'email' column exists in profiles table for search.
      // If not, search only on full_name or adapt.
      query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    query = query.order('created_at', { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users for admin:', error.message);
      return NextResponse.json({ message: 'خطا در دریافت لیست کاربران: ' + error.message }, { status: 500 });
    }

    // If email is not in profiles, you'd fetch it here for each user (N+1 problem)
    // or ideally design a Supabase function/view to get it in one go.

    return NextResponse.json({
      message: 'لیست کاربران با موفقیت دریافت شد.',
      data: users || [],
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      }
    }, { status: 200 });

  } catch (err) {
    console.error('GET Admin Users API - Generic error:', err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
