import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { ChefVerificationStatusSchema, TChefVerificationStatusRequest } from '@/lib/validators/admin';
import { ZodError } from 'zod';

interface VerifyChefRouteParams {
  params: {
    chefId: string; // The ID of the chef (profile ID) to verify/update
  };
}

// PATCH: Update verification status of a chef by Admin
export async function PATCH(request: NextRequest, { params }: VerifyChefRouteParams) {
  const { chefId } = params;
  if (!chefId) {
    return NextResponse.json({ message: 'شناسه آشپز الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const adminUserProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  // 1. Authenticate admin user
  if (!adminUserProfile) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز. لطفاً وارد شوید.' }, { status: 401 });
  }
  if (adminUserProfile.role !== 'admin') {
    return NextResponse.json({ message: 'شما اجازه انجام این عملیات را ندارید (فقط ادمین).' }, { status: 403 });
  }

  // 2. Validate request body
  let validatedRequestBody: TChefVerificationStatusRequest;
  try {
    const body = await request.json();
    validatedRequestBody = ChefVerificationStatusSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'اطلاعات ارسال شده نامعتبر است.', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  const { verification_status, admin_notes } = validatedRequestBody;

  try {
    // 3. Check if the target profile is indeed a chef
    const { data: chefProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, role, verification_status')
      .eq('id', chefId)
      .eq('role', 'chef') // Ensure we are updating a chef
      .single();

    if (fetchError || !chefProfile) {
      return NextResponse.json({ message: 'پروفایل آشپز مورد نظر یافت نشد.' }, { status: 404 });
    }

    // 4. Update the chef's verification status (and admin_notes if provided)
    // A column for admin_notes should be added to profiles table if this functionality is desired.
    // For now, only updating verification_status.
    const updatePayload: { verification_status: string; admin_notes?: string, updated_at: string } = {
        verification_status: verification_status,
        updated_at: new Date().toISOString(),
    };
    if (admin_notes) {
        // updatePayload.admin_notes = admin_notes; // Uncomment if you add 'admin_notes' column
        console.log(`Admin notes for chef ${chefId} (status: ${verification_status}): ${admin_notes}`);
    }


    const { data: updatedChef, error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', chefId)
      .select('id, verification_status, admin_notes') // Return the updated fields
      .single();

    if (updateError) {
      console.error(`Error updating chef ${chefId} verification status:`, updateError.message);
      return NextResponse.json({ message: 'خطا در به‌روزرسانی وضعیت تأیید آشپز: ' + updateError.message }, { status: 500 });
    }

    if (!updatedChef) {
        return NextResponse.json({ message: 'به‌روزرسانی انجام نشد، پروفایل آشپز یافت نشد پس از تلاش برای آپدیت.' }, { status: 404 });
    }

    // Send notification to the chef about their verification status change.
    const notificationPayload = {
        user_id: updatedChef.id, // chefId
        type: 'chef_verification_update',
        title: 'وضعیت تأیید حساب آشپزی شما به‌روز شد',
        message: `وضعیت تأیید حساب آشپزی شما توسط مدیریت به '${verification_status}' تغییر یافت. ${admin_notes ? `یادداشت ادمین: ${admin_notes}` : ''}`,
        link_to: '/dashboard/chef/profile', // Link to their profile where they might see more details or status
        metadata: { chefId: updatedChef.id, newStatus: verification_status, adminNotes: admin_notes }
    };
    const { error: notificationError } = await supabase.from('notifications').insert(notificationPayload);
    if (notificationError) {
        console.error(`Failed to create chef_verification_update notification for chef ${updatedChef.id}:`, notificationError.message);
    }

    return NextResponse.json({
      message: `وضعیت تأیید آشپز با موفقیت به '${verification_status}' تغییر یافت.`,
      data: updatedChef,
    }, { status: 200 });

  } catch (err) {
    console.error(`PATCH Admin Verify Chef API - Generic error for chef ${chefId}:`, err);
    const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده در سرور رخ داد.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
