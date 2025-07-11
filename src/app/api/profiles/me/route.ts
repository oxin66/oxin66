import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils'; // Re-use to get current user context
import { cookies } from 'next/headers';
import { ProfileUpdateSchema, TProfileUpdateRequest } from '@/lib/validators/profile';
import { ZodError } from 'zod';

// GET: Fetch the current user's full profile
export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  // getCurrentUserProfile already fetches the necessary fields based on its current definition
  // If more fields were added to profiles and not to getCurrentUserProfile, we might need a direct query here.
  // For now, assuming getCurrentUserProfile is sufficient or will be updated.
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'کاربر یافت نشد یا وارد نشده است.' }, { status: 401 });
  }

  // Potentially fetch more details if getCurrentUserProfile is too lean for profile page
  // For now, we return what getCurrentUserProfile provides.
  const supabase = createClient(cookieStore);
   const { data: fullProfileData, error: profileError } = await supabase
    .from('profiles')
    .select('*') // Select all columns from profiles table
    .eq('id', userProfile.id)
    .single();

  if (profileError || !fullProfileData) {
    console.error('Error fetching full profile for user (me):', profileError?.message);
    return NextResponse.json({ message: 'خطا در دریافت اطلاعات کامل پروفایل.' }, { status: 500 });
  }


  return NextResponse.json({
    message: 'اطلاعات پروفایل با موفقیت دریافت شد.',
    data: fullProfileData, // Return all fields from profiles table
  }, { status: 200 });
}


// PATCH: Update the current user's profile
export async function PATCH(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const userProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!userProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }

  let validatedRequestBody: Partial<TProfileUpdateRequest>; // Partial because not all fields are required for update
  try {
    const body = await request.json();
    // Use .partial() if you want to allow only a subset of fields to be updated
    // and not require all optional fields to be present in the request.
    // However, ProfileUpdateSchema already has .optional() on fields.
    validatedRequestBody = ProfileUpdateSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'اطلاعات ارسال شده نامعتبر است.', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  // Construct the update payload, only including fields that were actually sent
  const updatePayload: Record<string, any> = {};
  if (validatedRequestBody.full_name !== undefined) updatePayload.full_name = validatedRequestBody.full_name;
  if (validatedRequestBody.phone_number !== undefined) updatePayload.phone_number = validatedRequestBody.phone_number;
  if (validatedRequestBody.bio !== undefined) updatePayload.bio = validatedRequestBody.bio;
  if (validatedRequestBody.avatar_url !== undefined) updatePayload.avatar_url = validatedRequestBody.avatar_url;

  // Chef-specific fields, only update if the user is a chef
  if (userProfile.role === 'chef') {
    if (validatedRequestBody.kitchen_name !== undefined) updatePayload.kitchen_name = validatedRequestBody.kitchen_name;
    if (validatedRequestBody.specialties !== undefined) updatePayload.specialties = validatedRequestBody.specialties;
  } else {
    // If a non-chef tries to update chef-specific fields, ignore them or return an error
    if (validatedRequestBody.kitchen_name !== undefined || validatedRequestBody.specialties !== undefined) {
        console.warn(`User ${userProfile.id} (role: ${userProfile.role}) attempted to update chef-specific fields.`);
        // Optionally, return a 403 error here if strictness is required.
        // For now, we just ignore these fields for non-chefs.
        delete validatedRequestBody.kitchen_name;
        delete validatedRequestBody.specialties;
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ message: 'هیچ اطلاعاتی برای به‌روزرسانی ارسال نشده است.' }, { status: 400 });
  }

  updatePayload.updated_at = new Date().toISOString(); // Manually update timestamp

  try {
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userProfile.id)
      .select('*') // Return all fields of the updated profile
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      // Check for specific Supabase errors, e.g., RLS violation, unique constraint
      return NextResponse.json({ message: 'خطا در به‌روزرسانی پروفایل: ' + updateError.message }, { status: 500 });
    }

    if (!updatedProfile) {
        return NextResponse.json({ message: 'به‌روزرسانی انجام نشد، پروفایل یافت نشد پس از آپدیت.' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'پروفایل شما با موفقیت به‌روز شد.',
      data: updatedProfile,
    }, { status: 200 });

  } catch (error) {
    console.error('PATCH Profile API - Generic error:', error);
    const errorMessage = error instanceof Error ? error.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
