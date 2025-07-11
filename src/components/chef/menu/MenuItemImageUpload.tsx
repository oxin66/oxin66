'use client';

import React, { useState, ChangeEvent, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface MenuItemImageUploadProps {
  chefId: string;
  menuItemId: string; // Can be a temp ID for new items, or actual ID for existing
  currentImageUrl?: string | null;
  onUploadSuccess: (publicUrl: string, filePath: string) => void; // Pass filePath for potential deletion later
  onUploadError?: (errorMessage: string) => void;
  bucketName?: string; // e.g., 'menu-item-images'
}

const MenuItemImageUpload: React.FC<MenuItemImageUploadProps> = ({
  chefId,
  menuItemId, // This ID will be part of the path
  currentImageUrl,
  onUploadSuccess,
  onUploadError,
  bucketName = 'menu-item-images', // Default bucket
}) => {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const msg = 'فرمت فایل نامعتبر است. (JPG, PNG, WEBP)';
      setError(msg);
      if (onUploadError) onUploadError(msg);
      return;
    }
    const maxSizeMB = 2; // Max 2MB
    if (file.size > maxSizeMB * 1024 * 1024) {
      const msg = `حجم فایل نباید بیشتر از ${maxSizeMB} مگابایت باشد.`;
      setError(msg);
      if (onUploadError) onUploadError(msg);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const uniqueFileName = `item_image_${Date.now()}.${fileExtension}`;
      // Path: chefId/menuItemId/uniqueFileName.ext
      // Using menuItemId (even a temp one for new items) helps organize.
      // If menuItemId is temp, it means this image might be orphaned if user doesn't save the menu item.
      // A cleanup mechanism for orphaned images might be needed in a production system.
      const filePath = `${chefId}/${menuItemId}/${uniqueFileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // Set to false to avoid overwriting unrelated files if path isn't unique enough.
                         // Or true if the filename is always constant like 'cover.jpg' per item.
                         // With uniqueFileName, upsert:false is safer.
        });

      if (uploadError) throw uploadError;

      if (data?.path) {
        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
        if (publicUrlData?.publicUrl) {
          onUploadSuccess(publicUrlData.publicUrl, data.path); // Pass path for potential future deletion
        } else {
          throw new Error('URL عمومی تصویر پس از آپلود دریافت نشد.');
        }
      } else {
        throw new Error('آپلود انجام شد اما مسیر فایل بازگردانده نشد.');
      }
    } catch (e: any) {
      const errorMessage = e.message || 'خطا در آپلود تصویر آیتم منو.';
      console.error('Menu item image upload error:', e);
      setError(errorMessage);
      if (onUploadError) onUploadError(errorMessage);
      setPreviewUrl(currentImageUrl || null); // Revert preview
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2" dir="rtl">
      <div className="w-40 h-32 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-300">
        {previewUrl ? (
          <Image src={previewUrl} alt="پیش‌نمایش تصویر" layout="responsive" width={160} height={128} objectFit="cover" onError={() => setPreviewUrl(null)} />
        ) : (
          <span className="text-xs text-gray-400 p-2 text-center">بدون تصویر (یا پیش‌نمایش ناموفق)</span>
        )}
      </div>
      <label htmlFor={`menu-item-image-upload-${menuItemId}`} className={`cursor-pointer px-3 py-1.5 text-xs font-medium rounded-md transition-colors
        ${uploading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
        {uploading ? 'درحال آپلود...' : (previewUrl ? 'تغییر تصویر' : 'انتخاب تصویر')}
        <input
          id={`menu-item-image-upload-${menuItemId}`}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      <p className="text-xs text-gray-500">JPG, PNG, WEBP. حداکثر {2}MB.</p>
    </div>
  );
};

export default MenuItemImageUpload;
