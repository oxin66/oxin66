'use client';

import React, { useState, ChangeEvent, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; // Supabase client for storage
import Image from 'next/image'; // For optimized image display

interface AvatarUploadProps {
  userId: string; // To create a unique path in storage
  currentAvatarUrl?: string | null;
  onUploadSuccess: (publicUrl: string) => void; // Callback with the public URL of the uploaded image
  onUploadError?: (errorMessage: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ userId, currentAvatarUrl, onUploadSuccess, onUploadError }) => {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);

  useEffect(() => {
    setPreviewUrl(currentAvatarUrl || null); // Update preview if currentAvatarUrl prop changes
  }, [currentAvatarUrl]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic client-side validation (can be more extensive)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const msg = 'فرمت فایل نامعتبر است. لطفاً از فرمت‌های JPG, PNG, یا WEBP استفاده کنید.';
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

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      // Define file path in Supabase Storage.
      // Using a consistent name like 'avatar.png' allows easy replacement (update).
      // Adding a timestamp query param can help bust browser cache if needed: `?t=${new Date().getTime()}`
      const fileExtension = file.name.split('.').pop() || 'png';
      const fileName = `avatar.${fileExtension}`;
      const filePath = `${userId}/${fileName}`; // e.g., 'user-uuid/avatar.png'

      // Upload file to Supabase Storage (avatars bucket)
      // The 'upsert: true' option will overwrite if file already exists, good for avatars.
      const { data, error: uploadError } = await supabase.storage
        .from('avatars') // Ensure this is your bucket name
        .upload(filePath, file, {
          cacheControl: '3600', // Cache for 1 hour
          upsert: true, // Overwrite if file exists
        });

      if (uploadError) {
        throw uploadError;
      }

      if (data?.path) {
        // Get public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          // Add a timestamp to bust cache if needed for immediate display of new avatar
          const urlWithCacheBuster = `${publicUrlData.publicUrl}?t=${new Date().getTime()}`;
          onUploadSuccess(urlWithCacheBuster);
          // setPreviewUrl(urlWithCacheBuster); // Preview is already updated by FileReader, but this confirms server URL
        } else {
            throw new Error('URL عمومی تصویر پس از آپلود دریافت نشد.');
        }
      } else {
        throw new Error('آپلود انجام شد اما مسیر فایل بازگردانده نشد.');
      }
    } catch (e: any) {
      const errorMessage = e.message || 'خطا در آپلود تصویر.';
      console.error('Avatar upload error:', e);
      setError(errorMessage);
      if (onUploadError) onUploadError(errorMessage);
      setPreviewUrl(currentAvatarUrl || null); // Revert preview on error
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3" dir="rtl">
      <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-gray-300">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="پیش‌نمایش آواتار"
            width={128}
            height={128}
            className="object-cover w-full h-full"
            onError={() => {
                // In case the previewUrl (e.g. from FileReader) is valid but image component fails
                // or if the currentAvatarUrl from server is broken
                setPreviewUrl(null); // Fallback to placeholder
            }}
          />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <label htmlFor="avatar-upload" className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-md transition-colors
        ${uploading ? 'bg-gray-400 text-gray-700 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
        {uploading ? 'در حال آپلود...' : (previewUrl ? 'تغییر تصویر پروفایل' : 'انتخاب تصویر پروفایل')}
        <input
          id="avatar-upload"
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      <p className="text-xs text-gray-500">فرمت‌های مجاز: JPG, PNG, WEBP. حداکثر حجم: ۲ مگابایت.</p>
    </div>
  );
};

export default AvatarUpload;
