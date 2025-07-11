'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/userUtils';
import { ProfileUpdateSchema, TProfileUpdateRequest } from '@/lib/validators/profile';
import { ZodError } from 'zod';
import AvatarUpload from './AvatarUpload';
import AlertMessage from '@/components/ui/AlertMessage'; // Import AlertMessage

interface ProfileEditFormProps {
  initialProfileData: UserProfile;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ initialProfileData }) => {
  const router = useRouter(); // Not used currently, can be removed if not needed for redirection
  const [formData, setFormData] = useState<Partial<TProfileUpdateRequest>>({
    full_name: initialProfileData.fullName || '',
    phone_number: initialProfileData.phone_number || '',
    bio: initialProfileData.bio || '',
    avatar_url: initialProfileData.avatarUrl || '',
    kitchen_name: initialProfileData.kitchen_name || '', // Chef specific
    specialties: initialProfileData.specialties || [],   // Chef specific
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  // Sync form data if initialProfileData changes (e.g., after an update and re-fetch by parent)
  useEffect(() => {
    setFormData({
      full_name: initialProfileData.fullName || '',
      phone_number: initialProfileData.phone_number || '',
      bio: initialProfileData.bio || '',
      avatar_url: initialProfileData.avatarUrl || '',
      kitchen_name: initialProfileData.kitchen_name || '',
      specialties: initialProfileData.specialties || [],
    });
  }, [initialProfileData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setSuccessMessage(null); setError(null);
  };

  const handleSpecialtiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Assuming specialties are entered as comma-separated strings
    const specialtiesArray = e.target.value.split(',').map(s => s.trim()).filter(s => s);
    setFormData(prev => ({ ...prev, specialties: specialtiesArray }));
    setFieldErrors(prev => ({ ...prev, specialties: undefined }));
    setSuccessMessage(null); setError(null);
  };

  const handleAvatarUploadSuccess = (publicUrl: string) => {
    setFormData((prev) => ({ ...prev, avatar_url: publicUrl }));
    setSuccessMessage('تصویر پروفایل با موفقیت آپلود شد. برای ذخیره تغییرات، فرم را ارسال کنید.');
    setError(null);
  };

  const handleAvatarUploadError = (errorMessage: string) => {
    setError(`خطا در آپلود آواتار: ${errorMessage}`);
    setSuccessMessage(null);
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    // Prepare data for validation: only include fields relevant to the user's role
    const dataToValidate: Partial<TProfileUpdateRequest> = {
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        bio: formData.bio,
        avatar_url: formData.avatar_url,
    };
    if (initialProfileData.role === 'chef') {
        dataToValidate.kitchen_name = formData.kitchen_name;
        dataToValidate.specialties = formData.specialties;
    }

    const validationResult = ProfileUpdateSchema.partial().safeParse(dataToValidate); // Use partial for updates

    if (!validationResult.success) {
      const errors: Record<string, string | undefined> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFieldErrors(errors);
      setError('لطفاً خطاهای فرم را اصلاح کنید.');
      setIsLoading(false);
      return;
    }

    // Send only the changed fields or all fields as per API design
    // For PATCH, sending only changed fields is common.
    // Our API /api/profiles/me (PATCH) handles partial updates based on what's provided.

    try {
      const response = await fetch('/api/profiles/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.data), // Send validated (and potentially role-filtered) data
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || 'خطا در به‌روزرسانی پروفایل.');
        if (result.errors) {
            setFieldErrors(result.errors)
        }
      } else {
        setSuccessMessage('پروفایل شما با موفقیت به‌روز شد!');
        // Optionally, update initialProfileData or trigger a re-fetch in the parent page
        // router.refresh(); // This can re-run server components and update data
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای پیش بینی نشده رخ داد.';
      setError(`خطا: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {error && (
        <AlertMessage type="error" title="خطا در به‌روزرسانی" message={error} onClose={() => setError(null)} className="mb-4" />
      )}
      {successMessage && (
        <AlertMessage type="success" title="موفقیت" message={successMessage} onClose={() => setSuccessMessage(null)} className="mb-4" />
      )}

      <AvatarUpload
        userId={initialProfileData.id}
        currentAvatarUrl={formData.avatar_url}
        onUploadSuccess={handleAvatarUploadSuccess}
        onUploadError={handleAvatarUploadError}
      />

      {/* Common Fields */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 text-right mb-1">
          نام و نام خانوادگی <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="full_name"
          id="full_name"
          value={formData.full_name || ''}
          onChange={handleChange}
          className={`w-full p-2 border rounded-md shadow-sm focus:outline-none sm:text-sm text-right ${fieldErrors.full_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
        />
        {fieldErrors.full_name && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.full_name}</p>}
      </div>

      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 text-right mb-1">
          شماره موبایل
        </label>
        <input
          type="tel"
          name="phone_number"
          id="phone_number"
          value={formData.phone_number || ''}
          onChange={handleChange}
          placeholder="مثال: 09123456789"
          className={`w-full p-2 border rounded-md shadow-sm focus:outline-none sm:text-sm text-right ${fieldErrors.phone_number ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
          dir="ltr"
        />
         {fieldErrors.phone_number && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.phone_number}</p>}
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700 text-right mb-1">
          بیوگرافی (درباره من/آشپزخانه)
        </label>
        <textarea
          name="bio"
          id="bio"
          rows={3}
          value={formData.bio || ''}
          onChange={handleChange}
          className={`w-full p-2 border rounded-md shadow-sm focus:outline-none sm:text-sm text-right ${fieldErrors.bio ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
          placeholder="کمی درباره خودتان یا خدمات آشپزی‌تان بنویسید..."
        />
        {fieldErrors.bio && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.bio}</p>}
      </div>

      {/* Chef Specific Fields */}
      {initialProfileData.role === 'chef' && (
        <>
          <hr className="my-6" />
          <h3 className="text-lg font-medium text-gray-900 text-right mb-3">اطلاعات تکمیلی آشپز</h3>
          <div>
            <label htmlFor="kitchen_name" className="block text-sm font-medium text-gray-700 text-right mb-1">
              نام آشپزخانه/برند شما
            </label>
            <input
              type="text"
              name="kitchen_name"
              id="kitchen_name"
              value={formData.kitchen_name || ''}
              onChange={handleChange}
              className={`w-full p-2 border rounded-md shadow-sm focus:outline-none sm:text-sm text-right ${fieldErrors.kitchen_name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              placeholder="مثال: آشپزخانه خانگی سارا"
            />
            {fieldErrors.kitchen_name && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.kitchen_name}</p>}
          </div>
          <div>
            <label htmlFor="specialties" className="block text-sm font-medium text-gray-700 text-right mb-1">
              تخصص‌ها (با کاما جدا کنید)
            </label>
            <input
              type="text"
              name="specialties"
              id="specialties"
              value={(formData.specialties || []).join(', ')}
              onChange={handleSpecialtiesChange}
              className={`w-full p-2 border rounded-md shadow-sm focus:outline-none sm:text-sm text-right ${fieldErrors.specialties ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
              placeholder="مثال: غذای ایرانی, فست فود, کیک"
            />
            {fieldErrors.specialties && <p className="mt-1 text-xs text-red-600 text-right">{fieldErrors.specialties}</p>}
          </div>
        </>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          {isLoading ? 'در حال ذخیره تغییرات...' : 'ذخیره تغییرات پروفایل'}
        </button>
      </div>
    </form>
  );
};

export default ProfileEditForm;
