import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils';
import { cookies } from 'next/headers';
import { PartialMenuItemSchema, TPartialMenuItemRequest } from '@/lib/validators/menu';
import { ZodError } from 'zod';

interface ChefMenuItemRouteParams {
  params: {
    itemId: string;
  };
}

// GET: Fetch details of a specific menu item for the logged-in chef
export async function GET(request: NextRequest, { params }: ChefMenuItemRouteParams) {
  const { itemId } = params;
  if (!itemId) {
    return NextResponse.json({ message: 'شناسه آیتم منو الزامی است.' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const chefProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!chefProfile || chefProfile.role !== 'chef') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز.' }, { status: 403 });
  }

  try {
    const { data: menuItem, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', itemId)
      .eq('chef_id', chefProfile.id) // Ensure chef owns this item
      .maybeSingle();

    if (error) {
      console.error(`Error fetching menu item ${itemId} for chef ${chefProfile.id}:`, error.message);
      return NextResponse.json({ message: 'خطا در دریافت جزئیات آیتم منو: ' + error.message }, { status: 500 });
    }
    if (!menuItem) {
      return NextResponse.json({ message: 'آیتم منو یافت نشد یا شما مالک آن نیستید.' }, { status: 404 });
    }

    return NextResponse.json({ data: menuItem }, { status: 200 });
  } catch (err) {
    console.error(`GET Chef Menu Item Detail API - Generic error for item ${itemId}:`, err);
    return NextResponse.json({ message: (err as Error).message }, { status: 500 });
  }
}

// PATCH: Update a specific menu item for the logged-in chef
export async function PATCH(request: NextRequest, { params }: ChefMenuItemRouteParams) {
  const { itemId } = params;
  if (!itemId) return NextResponse.json({ message: 'شناسه آیتم منو الزامی است.' }, { status: 400 });

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const chefProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!chefProfile || chefProfile.role !== 'chef') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز.' }, { status: 403 });
  }
   if (chefProfile.verification_status !== 'approved') {
      return NextResponse.json({ message: 'حساب آشپزی شما برای ویرایش آیتم‌های منو باید تأیید شده باشد.' }, { status: 403 });
  }

  let validatedRequestBody: TPartialMenuItemRequest;
  try {
    const body = await request.json();
    validatedRequestBody = PartialMenuItemSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: 'اطلاعات ارسال شده نامعتبر است.', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  if (Object.keys(validatedRequestBody).length === 0) {
    return NextResponse.json({ message: 'هیچ اطلاعاتی برای به‌روزرسانی ارسال نشده است.' }, { status: 400 });
  }

  try {
    const updatePayload = { ...validatedRequestBody, updated_at: new Date().toISOString() };

    // Ensure chef_id is not being changed by the payload
    if ((updatePayload as any).chef_id && (updatePayload as any).chef_id !== chefProfile.id) {
        return NextResponse.json({ message: 'تغییر مالکیت آیتم منو مجاز نیست.' }, { status: 403 });
    }
    delete (updatePayload as any).chef_id; // Chef ID should not be updatable

    const { data: updatedMenuItem, error: updateError } = await supabase
      .from('menu_items')
      .update(updatePayload)
      .eq('id', itemId)
      .eq('chef_id', chefProfile.id) // Ensure chef owns this item
      .select()
      .single();

    if (updateError) {
      console.error(`Error updating menu item ${itemId}:`, updateError);
      return NextResponse.json({ message: 'خطا در به‌روزرسانی آیتم منو: ' + updateError.message }, { status: 500 });
    }
    if (!updatedMenuItem) {
        return NextResponse.json({ message: 'به‌روزرسانی انجام نشد، آیتم منو یافت نشد یا شما مالک آن نیستید.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'آیتم منو با موفقیت به‌روز شد.', data: updatedMenuItem }, { status: 200 });
  } catch (err) {
    console.error(`PATCH Chef Menu Item API - Generic error for item ${itemId}:`, err);
    return NextResponse.json({ message: (err as Error).message }, { status: 500 });
  }
}

// DELETE: Delete a specific menu item for the logged-in chef
export async function DELETE(request: NextRequest, { params }: ChefMenuItemRouteParams) {
  const { itemId } = params;
  if (!itemId) return NextResponse.json({ message: 'شناسه آیتم منو الزامی است.' }, { status: 400 });

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const chefProfile: UserProfile | null = await getCurrentUserProfile(() => cookieStore);

  if (!chefProfile || chefProfile.role !== 'chef') {
    return NextResponse.json({ message: 'دسترسی غیرمجاز.' }, { status: 403 });
  }
  // Verification status check might not be strictly needed for delete, but good for consistency
  if (chefProfile.verification_status !== 'approved') {
      return NextResponse.json({ message: 'حساب آشپزی شما برای حذف آیتم‌های منو باید تأیید شده باشد.' }, { status: 403 });
  }

  try {
    // Optional: Before deleting from DB, delete associated image from Supabase Storage if image_url exists
    const { data: itemToDelete, error: fetchError } = await supabase
        .from('menu_items')
        .select('image_url, chef_id')
        .eq('id', itemId)
        .eq('chef_id', chefProfile.id)
        .single();

    if (fetchError || !itemToDelete) {
        return NextResponse.json({ message: 'آیتم منو یافت نشد یا شما مالک آن نیستید.' }, { status: 404 });
    }

    if (itemToDelete.image_url) {
        // Extract file path from URL. Example: https://<project>.supabase.co/storage/v1/object/public/menu-item-images/chef_id/item_id/avatar.png
        // Path would be: chef_id/item_id/avatar.png
        // This requires careful parsing or storing the path directly.
        // For simplicity, assuming image_url is the direct path or can be parsed to it.
        // A more robust way is to store the storage path separately from the public URL.
        try {
            const urlParts = new URL(itemToDelete.image_url);
            const storagePath = urlParts.pathname.split('/menu-item-images/').pop(); // Adjust bucket name if different
            if (storagePath) {
                console.log(`Attempting to delete image from storage: ${storagePath}`);
                const { error: storageError } = await supabase.storage.from('menu-item-images').remove([storagePath]);
                if (storageError) {
                    console.warn(`Could not delete image ${storagePath} from storage: ${storageError.message}. Proceeding with DB delete.`);
                } else {
                    console.log(`Successfully deleted image ${storagePath} from storage.`);
                }
            }
        } catch (e) {
            console.warn("Error parsing image_url for deletion, or not a Supabase storage URL:", itemToDelete.image_url, e);
        }
    }


    const { error: deleteError, count } = await supabase
      .from('menu_items')
      .delete({ count: 'exact' })
      .eq('id', itemId)
      .eq('chef_id', chefProfile.id); // Ensure chef owns this item

    if (deleteError) {
      console.error(`Error deleting menu item ${itemId}:`, deleteError);
      return NextResponse.json({ message: 'خطا در حذف آیتم منو: ' + deleteError.message }, { status: 500 });
    }
    if (count === 0) {
        return NextResponse.json({ message: 'آیتم منو یافت نشد یا شما مالک آن نیستید (پس از تلاش برای حذف).' }, { status: 404 });
    }

    return NextResponse.json({ message: 'آیتم منو با موفقیت حذف شد.' }, { status: 200 }); // Or 204
  } catch (err) {
    console.error(`DELETE Chef Menu Item API - Generic error for item ${itemId}:`, err);
    return NextResponse.json({ message: (err as Error).message }, { status: 500 });
  }
}
