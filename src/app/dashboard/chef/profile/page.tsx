// This page is protected by ChefDashboardLayout and middleware
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import { UserProfile } from '@/lib/userUtils'; // Ensure this fetches all needed fields including chef specific ones
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ChefProfileEditPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    redirect('/login?message=لطفا برای ویرایش پروفایل آشپزی وارد شوید');
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*') // Select all fields for the edit form
    .eq('id', session.user.id)
    .single();

  if (profileError || !profileData) {
    console.error("Error fetching chef profile for edit page or profile not found:", profileError?.message);
    redirect('/dashboard/chef?error=profile_not_found');
  }

  const userProfile = profileData as UserProfile;

  if (userProfile.role !== 'chef' && userProfile.role !== 'admin') { // Admin might edit their 'chef' aspect profile here if such concept exists
    redirect('/?error=unauthorized_profile_access');
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ویرایش پروفایل آشپزخانه</h1>
        <p className="mt-1 text-sm text-gray-600">
          اطلاعات پروفایل آشپزی و آشپزخانه خود را در این بخش به‌روزرسانی کنید.
        </p>
      </header>

      {/* Display verification status if chef is not yet approved */}
      {userProfile.verification_status !== 'approved' && (
          <div
            className={`mb-6 p-4 rounded-md text-sm ${
              userProfile.verification_status === 'pending_review' ? 'bg-yellow-50 border-yellow-400 text-yellow-700' :
              userProfile.verification_status === 'rejected' ? 'bg-red-50 border-red-400 text-red-700' :
              userProfile.verification_status === 'needs_more_info' ? 'bg-blue-50 border-blue-400 text-blue-700' :
              'bg-gray-50 border-gray-400 text-gray-700'
            } border-r-4`}
            role="alert"
          >
            <p className="font-bold">وضعیت تأیید حساب آشپزی شما: {
                userProfile.verification_status === 'pending_review' ? 'در انتظار بررسی' :
                userProfile.verification_status === 'rejected' ? 'رد شده' :
                userProfile.verification_status === 'needs_more_info' ? 'نیاز به اطلاعات بیشتر' :
                userProfile.verification_status // Fallback
            }</p>
            <p className="mt-1">
                {userProfile.verification_status === 'pending_review' && 'پس از تأیید توسط ادمین، پروفایل شما به طور کامل فعال خواهد شد.'}
                {userProfile.verification_status === 'rejected' && 'برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.'}
                {userProfile.verification_status === 'needs_more_info' && 'لطفاً پیام‌های خود را برای دستورالعمل‌های لازم بررسی کنید یا با پشتیبانی تماس بگیرید.'}
            </p>
          </div>
        )}

      <ProfileEditForm initialProfileData={userProfile} />

      <div className="mt-8">
        <Link href="/dashboard/chef" className="text-sm text-blue-600 hover:underline">
            &larr; بازگشت به داشبورد آشپز
        </Link>
      </div>
    </div>
  );
}
