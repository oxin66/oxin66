import { type NextRequest, NextResponse } from 'next/server';
// import { createSupabaseServerClient } from '@/lib/supabase/server'; // Will be used later

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, phoneNumber, password } = await request.json();

    // TODO: Validate input using Zod (e.g., check password strength, email format)

    // TODO: Implement Supabase signup logic
    // const supabase = createSupabaseServerClient();
    // const { data, error } = await supabase.auth.signUp({
    //   email,
    //   password,
    //   phone: phoneNumber, // If phone number is provided
    //   options: {
    //     data: {
    //       full_name: fullName,
    //       // Add other metadata if needed
    //     },
    //     // emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`, // For email confirmation
    //   },
    // });

    // if (error) {
    //   return NextResponse.json({ message: error.message || 'خطا در ایجاد حساب کاربری' }, { status: 400 });
    // }

    // if (!data.user) {
    //    return NextResponse.json({ message: 'خطا: کاربر ایجاد نشد' }, { status: 500 });
    // }

    // if (data.user && !data.session) {
      // This case means user needs to confirm their email or phone
    //   return NextResponse.json({ message: 'ثبت نام موفقیت آمیز بود. لطفاً ایمیل خود را برای فعال سازی حساب بررسی کنید.' }, { status: 201 });
    // }


    // Placeholder response
    console.log('Signup API called with:', { fullName, email, phoneNumber, password });
    return NextResponse.json({ message: 'ثبت نام موفقیت آمیز (ساختار اولیه)', userId: 'temp-' + Date.now() }, { status: 201 });

  } catch (error) {
    console.error('Signup API Error:', error);
    let errorMessage = 'یک خطای ناشناخته در سرور رخ داد.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: 'خطا در پردازش درخواست ثبت نام', error: errorMessage }, { status: 500 });
  }
}
