'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MenuItemSchema, TMenuItemRequest, TPartialMenuItemRequest } from '@/lib/validators/menu';
import { ZodError } from 'zod';
import MenuItemImageUpload from './MenuItemImageUpload';
import { UserProfile } from '@/lib/userUtils'; // For chefId

// Define a type for the initial data passed to the form (can be partial for new item)
export interface MenuItemFormData extends Partial<TMenuItemRequest> {
  id?: string; // For editing existing items
  // image_storage_path?: string | null; // To keep track of the storage path for deletion if image changes
}

interface MenuItemFormProps {
  chefId: string; // Needed for image upload path and API calls
  initialData?: MenuItemFormData;
  onSubmitSuccess: (menuItemData: any) => void; // Callback with created/updated menu item
  onCancel?: () => void;
  isEditing?: boolean;
}

const MenuItemForm: React.FC<MenuItemFormProps> = ({
    chefId,
    initialData = { is_available: true }, // Default is_available to true for new items
    onSubmitSuccess,
    onCancel,
    isEditing = false
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState<MenuItemFormData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  // Used to generate a temporary ID for image upload path for new items
  const [tempItemId] = useState(initialData?.id || `temp_${Date.now()}`);


  useEffect(() => {
    // Ensure form is reset or updated if initialData changes (e.g. selecting different item to edit)
    setFormData(initialData);
  }, [initialData]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean | string[] | null | undefined = value;

    if (type === 'number') {
      processedValue = value === '' ? undefined : parseFloat(value);
    } else if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'tags') {
      processedValue = value.split(',').map(s => s.trim()).filter(s => s);
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setError(null); setSuccessMessage(null);
  };

  const handleImageUploadSuccess = (publicUrl: string, filePath: string) => {
    setFormData((prev) => ({
        ...prev,
        image_url: publicUrl,
        // image_storage_path: filePath // Store path if needed for explicit deletion on change
    }));
    setSuccessMessage('تصویر با موفقیت آپلود شد. برای ذخیره، فرم را ارسال کنید.');
  };

  const handleImageUploadError = (errorMessage: string) => {
    setError(`خطا در آپلود تصویر: ${errorMessage}`);
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    // Ensure price is a number, preparation_time_minutes is int or null
    const dataToValidate: any = {
        ...formData,
        price: formData.price !== undefined ? Number(formData.price) : undefined,
        preparation_time_minutes: formData.preparation_time_minutes !== undefined && formData.preparation_time_minutes !== null
            ? parseInt(String(formData.preparation_time_minutes), 10)
            : null,
        // Ensure tags is an array or null, not an empty string from input
        tags: formData.tags && Array.isArray(formData.tags) && formData.tags.length > 0 ? formData.tags : null,
    };
    // Remove id for validation schema if it's a new item (or schema handles it)
    // if (!isEditing) delete dataToValidate.id;
    // delete dataToValidate.image_storage_path; // Not part of MenuItemSchema

    const schemaToUse = isEditing ? PartialMenuItemSchema : MenuItemSchema;
    const validationResult = schemaToUse.safeParse(dataToValidate);

    if (!validationResult.success) {
      const errors: Record<string, string | undefined> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFieldErrors(errors);
      setError('لطفاً خطاهای فرم را اصلاح کنید.');
      setIsLoading(false);
      return;
    }

    const apiEndpoint = isEditing ? `/api/chef/menu-items/${formData.id}` : '/api/chef/menu-items';
    const apiMethod = isEditing ? 'PATCH' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.data),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || `خطا در ${isEditing ? 'به‌روزرسانی' : 'ایجاد'} آیتم منو.`);
        if (result.errors) setFieldErrors(result.errors);
      } else {
        setSuccessMessage(`آیتم منو با موفقیت ${isEditing ? 'به‌روز شد' : 'ایجاد شد'}!`);
        onSubmitSuccess(result.data);
        if (!isEditing) { // Reset form for new item creation
            setFormData({ name: '', price: undefined, is_available: true, image_url: null, description: '', category: '', tags: [], preparation_time_minutes: undefined });
            // Consider resetting preview in MenuItemImageUpload too, or remounting it.
        }
      }
    } catch (err) {
      setError(`خطا: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6 bg-white shadow rounded-lg border" dir="rtl">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
        {isEditing ? 'ویرایش آیتم منو' : 'افزودن آیتم جدید به منو'}
      </h3>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm" role="alert">{error}</div>
      )}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded-md text-sm" role="alert">{successMessage}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
            <MenuItemImageUpload
                chefId={chefId}
                menuItemId={tempItemId} // Use tempId for path consistency before actual ID is known
                currentImageUrl={formData.image_url}
                onUploadSuccess={handleImageUploadSuccess}
                onUploadError={handleImageUploadError}
            />
        </div>
        <div className="md:col-span-2 space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">نام غذا <span className="text-red-500">*</span></label>
                <input type="text" name="name" id="name" value={formData.name || ''} onChange={handleChange} required
                    className={`w-full p-2 border rounded-md ${fieldErrors.name ? 'border-red-500' : 'border-gray-300'}`} />
                {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>
            <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">قیمت (تومان) <span className="text-red-500">*</span></label>
                <input type="number" name="price" id="price" value={formData.price === undefined ? '' : formData.price} onChange={handleChange} required min="0" step="any"
                    className={`w-full p-2 border rounded-md ${fieldErrors.price ? 'border-red-500' : 'border-gray-300'}`} />
                {fieldErrors.price && <p className="text-xs text-red-500 mt-1">{fieldErrors.price}</p>}
            </div>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">توضیحات (اختیاری)</label>
        <textarea name="description" id="description" rows={3} value={formData.description || ''} onChange={handleChange}
                  className={`w-full p-2 border rounded-md ${fieldErrors.description ? 'border-red-500' : 'border-gray-300'}`} />
        {fieldErrors.description && <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">دسته‌بندی (اختیاری)</label>
          <input type="text" name="category" id="category" value={formData.category || ''} onChange={handleChange}
                 className={`w-full p-2 border rounded-md ${fieldErrors.category ? 'border-red-500' : 'border-gray-300'}`} placeholder="مثال: غذای اصلی، پیش‌غذا" />
          {fieldErrors.category && <p className="text-xs text-red-500 mt-1">{fieldErrors.category}</p>}
        </div>
        <div>
          <label htmlFor="preparation_time_minutes" className="block text-sm font-medium text-gray-700 mb-1">زمان آماده‌سازی (دقیقه - اختیاری)</label>
          <input type="number" name="preparation_time_minutes" id="preparation_time_minutes" value={formData.preparation_time_minutes === undefined || formData.preparation_time_minutes === null ? '' : formData.preparation_time_minutes} onChange={handleChange} min="0"
                 className={`w-full p-2 border rounded-md ${fieldErrors.preparation_time_minutes ? 'border-red-500' : 'border-gray-300'}`} />
          {fieldErrors.preparation_time_minutes && <p className="text-xs text-red-500 mt-1">{fieldErrors.preparation_time_minutes}</p>}
        </div>
         <div className="flex items-center pt-6">
            <input type="checkbox" name="is_available" id="is_available" checked={formData.is_available === undefined ? true : formData.is_available} onChange={handleChange}
                   className="h-4 w-4 text-indigo-600 border-gray-300 rounded ml-2 focus:ring-indigo-500" />
            <label htmlFor="is_available" className="text-sm font-medium text-gray-700">در دسترس برای سفارش</label>
        </div>
      </div>

      <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">تگ‌ها (با کاما جدا کنید - اختیاری)</label>
          <input type="text" name="tags" id="tags" value={(formData.tags || []).join(', ')} onChange={handleSpecialtiesChange} // Re-use similar handler
                 className={`w-full p-2 border rounded-md ${fieldErrors.tags ? 'border-red-500' : 'border-gray-300'}`} placeholder="مثال: تند, گیاهی, پرطرفدار" />
          {fieldErrors.tags && <p className="text-xs text-red-500 mt-1">{fieldErrors.tags}</p>}
      </div>


      <div className="flex flex-col sm:flex-row gap-3 pt-3">
        <button type="submit" disabled={isLoading}
                className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:bg-gray-400">
          {isLoading ? 'در حال ذخیره...' : (isEditing ? 'ذخیره تغییرات آیتم' : 'افزودن آیتم به منو')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={isLoading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-md hover:bg-gray-300 disabled:bg-gray-100">
            انصراف
          </button>
        )}
      </div>
    </form>
  );
};

export default MenuItemForm;
