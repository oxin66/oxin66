import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { UserUpdateByAdminSchema, TUserUpdateByAdminRequest } from '@/lib/validators/admin';
import { ZodError } from 'zod';

interface AdminUserRouteParams {
  params: {
    userId: string; // The ID of the user (profile ID) to manage
  };
}

// GET: Fetch details of a specific user by Admin
export async function GET(request: NextRequest, { params }: AdminUserRouteParams) {
  const { userId } = params;
  if (!userId) {
    return NextResponse.json({ message: 'شناسه کاربر الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!adminUserProfile || adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز (فقط ادمین).' }, { status: 403 });
  }

  try {
    // Fetch profile data. To get auth email, a join or separate call to auth.admin.getUserById is needed.
    // For now, assuming email is in profiles or not strictly required for display here.
    const { data: targetUserProfile, error } = await supabase
      .from('profiles')
      .select('*') // Select all profile fields
      .eq('id', userId)
      .single();

    if (error || !targetUserProfile) {
      console.error(`Error fetching profile for user ${userId} by admin:`, error?.message);
      return NextResponse.json({ message: 'کاربر مورد نظر یافت نشد.' }, { status: 404 });
    }

    // Optionally, fetch auth-specific data if needed (e.g., last_sign_in_at, email from auth table)
    // This requires using Supabase admin client for auth table.
    // const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(userId);
    // if (authError) console.warn("Could not fetch auth user details for admin view", authError);
    // const combinedData = { ...targetUserProfile, auth_email: authUser?.email, last_sign_in_at: authUser?.last_sign_in_at };

    return NextResponse.json({
      message: 'اطلاعات کاربر با موفقیت دریافت شد.',
      data: targetUserProfile, // Or combinedData if fetching auth details
    }, { status: 200 });

  } catch (err) {
    console.error(`GET Admin User Details API - Generic error for user ${userId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}


// PATCH: Update a specific user's profile by Admin
export async function PATCH(request: NextRequest, { params }: AdminUserRouteParams) {
  const { userId } = params;
  if (!userId) {
    return NextResponse.json({ message: 'شناسه کاربر الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!adminUserProfile || adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز (فقط ادمین).' }, { status: 403 });
  }

  // Prevent admin from accidentally modifying their own critical data via this generic endpoint
  // if (userId === adminUserProfile.id) {
  //   return NextResponse.json({ message: 'شما نمی‌توانید پروفایل خود را از این طریق ویرایش کنید.' }, { status: 403 });
  // }


  let validatedRequestBody: Partial<TUserUpdateByAdminRequest>;
  try {
    const body = await request.json();
    // Use .partial() to allow updating only a subset of fields.
    // The schema itself has .optional() on fields, so direct parse should also work if all optional.
    validatedRequestBody = UserUpdateByAdminSchema.partial().parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'اطلاعات ارسال شده نامعتبر است.', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  if (Object.keys(validatedRequestBody).length === 0) {
    return NextResponse.json({ message: 'هیچ اطلاعاتی برای به‌روزرسانی ارسال نشده است.' }, { status: 400 });
  }

  // Ensure that if verification_status is being set, it's for a chef
  if (validatedRequestBody.verification_status) {
      const { data: targetUserRole, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (roleError || !targetUserRole || targetUserRole.role !== 'chef') {
          return NextResponse.json({ message: 'وضعیت تأیید فقط برای آشپزها قابل تنظیم است.'}, {status: 400});
      }
  }

  // If role is changed from 'chef' to 'user', admin might want to clear chef-specific fields
  // or handle verification_status (e.g., set to null or a default non-chef status).
  // This logic can be complex and depends on business rules. For now, simple update.

  const updatePayload = { ...validatedRequestBody, updated_at: new Date().toISOString() };

  try {
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select('*') // Return all fields of the updated profile
      .single();

    if (updateError) {
      console.error(`Error updating user ${userId} by admin:`, updateError);
      return NextResponse.json({ message: 'خطا در به‌روزرسانی کاربر: ' + updateError.message }, { status: 500 });
    }
    if (!updatedUser) {
        return NextResponse.json({ message: 'به‌روزرسانی انجام نشد، کاربر یافت نشد پس از آپدیت.' }, { status: 404 });
    }

    // If 'account_status' was changed to 'suspended' or 'banned_by_admin',
    // admin might need to sign out the user from all sessions.
    // This requires Supabase Admin SDK: await supabase.auth.admin.signOut(userId)
    // This is an advanced feature for later.

    return NextResponse.json({
      message: 'اطلاعات کاربر با موفقیت به‌روز شد.',
      data: updatedUser,
    }, { status: 200 });

  } catch (err) {
    console.error(`PATCH Admin User Update API - Generic error for user ${userId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
