// This page is protected by UserDashboardLayout and middleware
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import { getCurrentUserProfile, UserProfile } from '@/lib/userUtils'; // Ensure this fetches all needed fields
import { createClient } from '@/lib/supabase/server'; // To fetch full profile data if needed
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function UserProfileEditPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Fetch the most up-to-date and complete profile data directly here for the form
  // getCurrentUserProfile might be a leaner version for layouts.
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    redirect('/login?message=لطفا برای ویرایش پروفایل وارد شوید');
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*') // Select all fields for the edit form
    .eq('id', session.user.id)
    .single();

  if (profileError || !profileData) {
    console.error("Error fetching profile for edit page or profile not found:", profileError?.message);
    // Redirect or show an error message. User should have a profile.
    // If profile is missing, it might indicate an issue during signup.
    // For now, redirect to a generic error or dashboard.
    redirect('/dashboard/user?error=profile_not_found');
  }

  // Cast to UserProfile type, ensure UserProfile includes all fields from profiles table
  const userProfile = profileData as UserProfile;

  if (userProfile.role !== 'user' && userProfile.role !== 'admin') { // Admin might edit their 'user' aspect profile here
    redirect('/?error=unauthorized_profile_access');
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ویرایش پروفایل کاربری</h1>
        <p className="mt-1 text-sm text-gray-600">
          اطلاعات پروفایل خود را در این بخش به‌روزرسانی کنید.
        </p>
      </header>

      <ProfileEditForm initialProfileData={userProfile} />

      <div className="mt-8">
        <Link href="/dashboard/user" className="text-sm text-blue-600 hover:underline">
            &larr; بازگشت به داشبورد کاربر
        </Link>
      </div>
    </div>
  );
}
