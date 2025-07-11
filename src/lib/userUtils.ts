import { createClient } from '@/lib/supabase/server'; // For server-side usage
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export interface UserProfile {
  id: string;
  email?: string;
  role: string | null;
  fullName: string | null;
  avatarUrl?: string | null;
  verification_status?: 'pending_review' | 'approved' | 'rejected' | 'needs_more_info' | string | null;
  bio?: string | null;
  kitchen_name?: string | null;
  specialties?: string[] | null;
  average_rating?: number | null;   // Added for chefs
  total_reviews?: number | null;    // Added for chefs
  // Add other profile fields as needed
}

export async function getCurrentUserProfile(cookieStoreAccessor: () => ReadonlyRequestCookies): Promise<UserProfile | null> {
  const cookieStore = cookieStoreAccessor(); // Get the cookie store
  const supabase = createClient(cookieStore);

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Error getting session:', sessionError.message);
    return null;
  }

  if (!session || !session.user) {
    // console.log('No active session or user in session.');
    return null;
  }

  const user = session.user;

  // Now fetch the profile information from 'profiles' table
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url, verification_status, bio, kitchen_name, specialties, average_rating, total_reviews') // Added rating fields
    .eq('id', user.id)
    .single(); // Assuming one profile per user

  if (profileError) {
    console.error('Error fetching user profile:', profileError.message);
    // It's possible the profile doesn't exist yet if signup process was interrupted
    // Or RLS is preventing access.
    // For now, return user data without profile specifics or handle as critical error.
    // If profile is essential, you might return null or throw an error.
    // Consider what should happen if a profile is missing for an authenticated user.
    return {
        id: user.id,
        email: user.email,
        role: null, // Indicate profile data is missing/incomplete
        fullName: null,
    };
  }

  return {
    id: user.id,
    email: user.email,
    role: profileData?.role || null,
    fullName: profileData?.full_name || null,
    avatarUrl: profileData?.avatar_url || null,
    verification_status: profileData?.verification_status || null,
    bio: profileData?.bio || null,
    kitchen_name: profileData?.kitchen_name || null,
    specialties: profileData?.specialties || null,
    average_rating: profileData?.average_rating ? parseFloat(String(profileData.average_rating)) : null, // Ensure number
    total_reviews: profileData?.total_reviews || null,     // Added
  };
}

// Example of how to use it in a Server Component:
/*
import { cookies } from 'next/headers';
import { getCurrentUserProfile } from '@/lib/userUtils';

export default async function MyServerComponent() {
  const userProfile = await getCurrentUserProfile(() => cookies()); // Pass cookies() accessor

  if (!userProfile) {
    return <p>User not logged in.</p>;
  }

  return (
    <div>
      <p>Welcome, {userProfile.fullName || userProfile.email}</p>
      <p>Your role is: {userProfile.role}</p>
    </div>
  );
}
*/

// Helper to get Supabase client for Route Handlers (similar to server.ts but can be centralized)
// This is slightly redundant with createClient in server.ts but shows pattern for direct use
// export function getSupabaseClientForRouteHandler(request: NextRequest) {
//   const cookieStore = request.cookies;
//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         get(name: string) {
//           return cookieStore.get(name)?.value;
//         },
//         set(name: string, value: string, options: CookieOptions) {
//           // For Route Handlers, setting cookies directly on request is not typical.
//           // Response object should be used.
//         },
//         remove(name: string, options: CookieOptions) {
//           // Similar to set.
//         },
//       },
//     }
//   );
// }
