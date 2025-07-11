import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';

// GET: Fetch all chefs for admin panel
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  // 1. Authenticate user and check for admin role
  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }
  if (userProfile.role !== 'admin') {
    return NextResponse.json({ message: 'شما اجازه دسترسی به این اطلاعات را ندارید (فقط ادمین).' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10); // Default 20 chefs per page
  const offset = (page - 1) * limit;
  const statusFilter = searchParams.get('status'); // Filter by verification_status
  const searchQuery = searchParams.get('q'); // Search by name or email


  try {
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
        created_at,
        updated_at
        -- Potentially other fields admin might need to see
      `, { count: 'exact' }) // Get total count for pagination
      .eq('role', 'chef'); // Only fetch users with role 'chef'

    if (statusFilter) {
      query = query.eq('verification_status', statusFilter);
    }
    if (searchQuery) {
        // Search in full_name or email. Supabase requires tsvector for full-text search for optimal performance.
        // For simple LIKE, use .or()
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    query = query.order('created_at', { ascending: false })
                 .range(offset, offset + limit - 1);

    const { data: chefs, error, count } = await query;

    if (error) {
      console.error('Error fetching chefs for admin:', error.message);
      return NextResponse.json({ message: 'خطا در دریافت لیست آشپزها: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'لیست آشپزها با موفقیت دریافت شد.',
      data: chefs || [],
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalItems: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0,
      }
    }, { status: 200 });

  } catch (err) {
    console.error('GET Admin Chefs API - Generic error:', err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
