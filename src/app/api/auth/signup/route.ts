import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Server client for Supabase
import { SignupValidator } from '@/lib/validators/auth'; // Removed TSignupRequest as it's inferred
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName, phoneNumber, role } = SignupValidator.parse(body);

    // It's crucial to use the server client that can handle cookies for SSR/API Routes
    const cookieStore = request.cookies;
    const supabase = createClient(cookieStore);


    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // data can be used to store metadata that is NOT immediately available in JWT
        // but can be retrieved later or used by database triggers if configured.
        // We are inserting into 'profiles' table explicitly after signup.
        // email_confirm: true, // Enable in Supabase project settings if you want email confirmation
      },
    });

    if (authError) {
      console.error('Supabase Auth Error:', authError.message, 'Status:', authError.status);
      // Check for common errors
      if (authError.message.includes('User already registered') || authError.status === 422) {
        return NextResponse.json({ message: 'این ایمیل قبلاً ثبت نام شده است.' }, { status: 409 }); // 409 Conflict
      }
      if (authError.message.includes('Password should be at least 6 characters')) {
        return NextResponse.json({ message: 'رمز عبور باید حداقل ۶ کاراکتر باشد (طبق تنظیمات Supabase).' }, { status: 400 });
      }
      return NextResponse.json({ message: authError.message || 'خطا در ایجاد حساب کاربری در سرویس احراز هویت.' }, { status: authError.status || 500 });
    }

    if (!authData.user) {
      // This case should ideally not happen if authError is null, but good to check
      console.error('Supabase Auth: User object is null despite no error.');
      return NextResponse.json({ message: 'حساب کاربری ایجاد نشد، اطلاعات کاربر بازگردانده نشد.' }, { status: 500 });
    }

    const userId = authData.user.id;

    // 2. Insert user profile into the 'profiles' table
    // This uses the authenticated user's session (from signUp) to perform the insert.
    // RLS policies on 'profiles' table must allow a newly authenticated user to insert their own profile.
    // A common RLS policy for insert would be: `auth.uid() = id`

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId, // This must match the auth.users.id
        full_name: fullName,
        phone_number: phoneNumber,
        role: role,
        // avatar_url and other fields can be added here or updated later
      });

    if (profileError) {
      console.error('Supabase Profile Insert Error:', profileError.message, 'Code:', profileError.code);
      // IMPORTANT: If profile creation fails, we should delete the auth user
      // to avoid orphaned auth entries. This requires admin privileges.
      // const adminSupabase = createClient(cookieStore, { isAdmin: true }); // Hypothetical admin client
      // await adminSupabase.auth.admin.deleteUser(userId);
      // For now, log and return error. Manual cleanup might be needed for orphaned auth user.
      return NextResponse.json({ message: 'حساب کاربری ایجاد شد اما ذخیره اطلاعات پروفایل با خطا مواجه شد. لطفاً با پشتیبانی تماس بگیرید.' }, { status: 500 });
    }

    // Determine success message
    // authData.session will be null if email confirmation is required and user is not logged in yet.
    // authData.user will contain the user object regardless.
    let success_message = 'ثبت نام شما با موفقیت انجام شد.';
    if (authData.session) {
        success_message = 'ثبت نام و ورود شما با موفقیت انجام شد. در حال انتقال به داشبورد...';
    } else if (authData.user.email_confirmed_at === null && process.env.NEXT_PUBLIC_SUPABASE_EMAIL_CONFIRMATION_REQUIRED === 'true') {
        // Check your Supabase project's email confirmation settings
        success_message = 'ثبت نام شما با موفقیت انجام شد. یک ایمیل فعال سازی برای شما ارسال شد. لطفاً ایمیل خود را بررسی کنید.';
    }


    return NextResponse.json({
        message: success_message,
        user: { id: userId, email: authData.user.email, role: role }
    }, { status: 201 });

  } catch (error) {
    if (error instanceof ZodError) {
      // Convert Zod errors to a more user-friendly format if needed
      const formattedErrors = error.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return NextResponse.json({ message: 'اطلاعات وارد شده نامعتبر است.', errors: formattedErrors }, { status: 400 });
    }
    console.error('Generic Signup API Error:', error);
    // Avoid sending detailed internal error messages to the client in production
    return NextResponse.json({ message: 'یک خطای پیش بینی نشده در سرور رخ داد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.' }, { status: 500 });
  }
}
