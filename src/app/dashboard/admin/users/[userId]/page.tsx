'use client'; // This page will involve form handling and state

import React, { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Use useParams for App Router
import { UserProfile } from '@/lib/userUtils'; // Assuming this is comprehensive
import { UserUpdateByAdminSchema, TUserUpdateByAdminRequest } from '@/lib/validators/admin';
import { ZodError } from 'zod';
import Link from 'next/link';

// Helper function to fetch user details (client-side)
async function fetchUserDetails(userId: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(`/api/admin/users/${userId}`);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'خطا در دریافت اطلاعات کاربر');
    }
    const data = await response.json();
    return data.data as UserProfile;
  } catch (error) {
    console.error("Failed to fetch user details:", error);
    return null;
  }
}

export default function AdminEditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string; // Get userId from path

  const [user, setUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState<Partial<TUserUpdateByAdminRequest>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  useEffect(() => {
    if (userId) {
      setIsLoading(true);
      fetchUserDetails(userId)
        .then(userData => {
          if (userData) {
            setUser(userData);
            // Initialize form data from fetched user data
            setFormData({
              full_name: userData.fullName || '',
              phone_number: userData.phone_number || '',
              role: userData.role || 'user', // default to 'user' if null
              account_status: userData.account_status || 'active',
              verification_status: userData.verification_status || (userData.role === 'chef' ? 'pending_review' : undefined),
              // admin_general_notes: userData.admin_general_notes || '', // If this field exists
            });
          } else {
            setError('کاربر یافت نشد.');
          }
        })
        .catch(err => setError((err as Error).message))
        .finally(() => setIsLoading(false));
    }
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    setError(null); setSuccessMessage(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    // Filter out fields that haven't changed from the original user data
    // to send only actual updates. Or send all, API will handle.
    // For simplicity, sending all fields from formData that are in the schema.
    const dataToValidate: Partial<TUserUpdateByAdminRequest> = {};
    if(formData.full_name !== user.fullName) dataToValidate.full_name = formData.full_name;
    if(formData.phone_number !== user.phone_number) dataToValidate.phone_number = formData.phone_number;
    if(formData.role !== user.role) dataToValidate.role = formData.role as any;
    if(formData.account_status !== user.account_status) dataToValidate.account_status = formData.account_status as any;
    if(user.role === 'chef' && formData.verification_status !== user.verification_status) {
        dataToValidate.verification_status = formData.verification_status as any;
    }
    // Add admin_general_notes if implemented

    // If nothing changed, no need to submit.
    // This check is basic, deeper comparison might be needed for objects/arrays.
    if (Object.keys(dataToValidate).length === 0 && !formData.admin_general_notes) { // Assuming admin_general_notes is a field to always send if present
        setSuccessMessage("هیچ تغییری برای ذخیره وجود ندارد.");
        setIsUpdating(false);
        return;
    }

    // Ensure all parts of formData are passed for validation if they are part of the schema
    const validationResult = UserUpdateByAdminSchema.partial().safeParse(formData);


    if (!validationResult.success) {
      const errors: Record<string, string | undefined> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFieldErrors(errors);
      setError('لطفاً خطاهای فرم را اصلاح کنید.');
      setIsUpdating(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationResult.data), // Send only validated & changed data
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'خطا در به‌روزرسانی اطلاعات کاربر.');
      }
      setSuccessMessage('اطلاعات کاربر با موفقیت به‌روز شد.');
      setUser(result.data); // Update local user state with response from server
       // Re-initialize form with new data to reflect saved changes and clear "dirty" state
      setFormData({
        full_name: result.data.fullName || '',
        phone_number: result.data.phone_number || '',
        role: result.data.role || 'user',
        account_status: result.data.account_status || 'active',
        verification_status: result.data.verification_status || (result.data.role === 'chef' ? 'pending_review' : undefined),
      });
      // router.refresh(); // Or refresh to ensure data consistency across app
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) return <div className="text-center py-10">در حال بارگذاری اطلاعات کاربر...</div>;
  if (error && !user) return <div className="text-center py-10 text-red-500">خطا: {error}</div>;
  if (!user) return <div className="text-center py-10">کاربر یافت نشد.</div>;

  const roles = ['user', 'chef', 'admin'];
  const accountStatuses = ['active', 'suspended', 'banned_by_admin', 'pending_deletion'];
  const verificationStatuses = ['pending_review', 'approved', 'rejected', 'needs_more_info'];


  return (
    <div dir="rtl">
      <header className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">ویرایش کاربر: {user.fullName || user.email}</h1>
            <p className="text-sm text-gray-500">شناسه کاربر: {user.id}</p>
        </div>
        <Link href="/dashboard/admin/users" className="text-sm text-blue-600 hover:underline">
            &larr; بازگشت به لیست کاربران
        </Link>
      </header>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-4" role="alert">
          <p className="font-bold">خطا</p> <p>{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md mb-4" role="alert">
          <p className="font-bold">موفقیت</p> <p>{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 shadow-md rounded-lg">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">نام کامل:</label>
          <input type="text" name="full_name" id="full_name" value={formData.full_name || ''} onChange={handleChange}
                 className={`w-full p-2 border rounded-md ${fieldErrors.full_name ? 'border-red-500' : 'border-gray-300'}`} />
          {fieldErrors.full_name && <p className="text-xs text-red-500 mt-1">{fieldErrors.full_name}</p>}
        </div>

        <div>
          <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">شماره موبایل:</label>
          <input type="text" name="phone_number" id="phone_number" value={formData.phone_number || ''} onChange={handleChange}
                 className={`w-full p-2 border rounded-md ${fieldErrors.phone_number ? 'border-red-500' : 'border-gray-300'}`} dir="ltr"/>
          {fieldErrors.phone_number && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone_number}</p>}
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">نقش:</label>
          <select name="role" id="role" value={formData.role || ''} onChange={handleChange}
                  className={`w-full p-2 border rounded-md bg-white ${fieldErrors.role ? 'border-red-500' : 'border-gray-300'}`}>
            {roles.map(r => <option key={r} value={r}>{r === 'user' ? 'کاربر عادی' : r === 'chef' ? 'آشپز' : 'ادمین'}</option>)}
          </select>
          {fieldErrors.role && <p className="text-xs text-red-500 mt-1">{fieldErrors.role}</p>}
        </div>

        <div>
          <label htmlFor="account_status" className="block text-sm font-medium text-gray-700 mb-1">وضعیت حساب:</label>
          <select name="account_status" id="account_status" value={formData.account_status || ''} onChange={handleChange}
                  className={`w-full p-2 border rounded-md bg-white ${fieldErrors.account_status ? 'border-red-500' : 'border-gray-300'}`}>
            {accountStatuses.map(s => <option key={s} value={s}>{
                s === 'active' ? 'فعال' :
                s === 'suspended' ? 'معلق' :
                s === 'banned_by_admin' ? 'مسدود توسط ادمین' :
                s === 'pending_deletion' ? 'در انتظار حذف' : s
            }</option>)}
          </select>
          {fieldErrors.account_status && <p className="text-xs text-red-500 mt-1">{fieldErrors.account_status}</p>}
        </div>

        {formData.role === 'chef' && (
          <div>
            <label htmlFor="verification_status" className="block text-sm font-medium text-gray-700 mb-1">وضعیت تأیید (آشپز):</label>
            <select name="verification_status" id="verification_status" value={formData.verification_status || ''} onChange={handleChange}
                    className={`w-full p-2 border rounded-md bg-white ${fieldErrors.verification_status ? 'border-red-500' : 'border-gray-300'}`}>
              {verificationStatuses.map(s => <option key={s} value={s}>{
                s === 'pending_review' ? 'در انتظار بررسی' :
                s === 'approved' ? 'تأیید شده' :
                s === 'rejected' ? 'رد شده' :
                s === 'needs_more_info' ? 'نیاز به اطلاعات بیشتر' : s
              }</option>)}
            </select>
            {fieldErrors.verification_status && <p className="text-xs text-red-500 mt-1">{fieldErrors.verification_status}</p>}
          </div>
        )}

        {/* Admin General Notes - if you add this field to profiles and schema */}
        {/* <div>
          <label htmlFor="admin_general_notes" className="block text-sm font-medium text-gray-700 mb-1">یادداشت‌های ادمین:</label>
          <textarea name="admin_general_notes" id="admin_general_notes" value={formData.admin_general_notes || ''} onChange={handleChange}
                 rows={3} className="w-full p-2 border border-gray-300 rounded-md" />
        </div> */}

        <button type="submit" disabled={isUpdating}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-gray-400">
          {isUpdating ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
      </form>
    </div>
  );
}
