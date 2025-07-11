import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation'; // For handling not found or unauthorized access
import { UserProfile } from '@/lib/userUtils'; // Assuming UserProfile is comprehensive enough
// We will also need types for menu items and reviews, or import them.
// For now, we might use 'any' and refine later.

import ChefPublicProfileHeader from '@/components/chefs/public/ChefPublicProfileHeader';
import ChefPublicMenuList from '@/components/chefs/public/ChefPublicMenuList';
import ChefPublicReviewList from '@/components/chefs/public/ChefPublicReviewList';
import { PublicMenuItemData } from '@/components/chefs/public/ChefPublicMenuItem'; // Import type
import { ReviewItemData } from '@/components/reviews/ReviewListItem'; // Import type

interface ChefPublicProfilePageProps {
  params: {
    chefId: string;
  };
}

interface ChefProfilePageData {
    profile: UserProfile;
    menu: PublicMenuItemData[];
    reviews: ReviewItemData[];
    reviewPagination: {
        currentPage: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
    };
}

// Helper function to fetch all necessary data for the chef's public profile
async function getChefPublicProfileData(chefId: string): Promise<ChefProfilePageData | null> {
  const supabase = createClient(cookies());

  // 1. Fetch Chef's Profile Data
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select(`
        id,
        full_name,
        kitchen_name,
        bio,
        avatar_url,
        specialties,
        average_rating,
        total_reviews,
        role,
        verification_status,
        account_status
    `)
    .eq('id', chefId)
    .eq('role', 'chef') // Ensure it's a chef profile
    .single();

  if (profileError || !profileData) {
    console.error(`Error fetching profile for chef ${chefId}: ${profileError?.message}`);
    return null; // Chef not found or error
  }

  // Check if chef is active and verified to be publicly visible
  if (profileData.verification_status !== 'approved' || profileData.account_status !== 'active') {
    console.log(`Chef ${chefId} is not active or verified. Profile not publicly visible.`);
    return null; // Profile should not be public
  }

  // 2. Fetch Chef's Menu Items (publicly available ones)
  // Using the public API logic here directly for server component
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('chef_id', chefId)
    .eq('is_available', true)
    .order('category', { nullsFirst: false })
    .order('created_at', { ascending: true });

  if (menuError) {
    console.error(`Error fetching menu for chef ${chefId}: ${menuError.message}`);
    // Continue without menu if it fails, or handle as critical error
  }

  // 3. Fetch Chef's Public Reviews (with pagination, first page for now)
  const { data: reviews, error: reviewsError, count: reviewCount } = await supabase
    .from('reviews')
    .select(`
        id, rating, comment, created_at,
        userProfile:profiles!reviews_user_id_fkey (full_name, avatar_url)
    `, { count: 'exact' })
    .eq('chef_id', chefId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(5); // Fetch first 5 reviews for initial display

  if (reviewsError) {
    console.error(`Error fetching reviews for chef ${chefId}: ${reviewsError.message}`);
    // Continue without reviews if it fails
  }

  return {
    profile: profileData as UserProfile, // Cast to UserProfile, ensure it matches
    menu: menuItems || [],
    reviews: reviews || [],
    reviewPagination: {
        currentPage: 1,
        pageSize: 5,
        totalItems: reviewCount || 0,
        totalPages: reviewCount ? Math.ceil(reviewCount / 5) : 0,
    }
  };
}


export default async function ChefPublicProfilePage({ params }: ChefPublicProfilePageProps) {
  const { chefId } = params;

  if (!chefId) {
    notFound(); // Should be caught by Next.js routing if segment is missing
  }

  const chefData = await getChefPublicProfileData(chefId);

  if (!chefData) {
    // Chef not found, or not active/verified, so show a 404 page
    notFound();
  }

  const { profile, menu, reviews, reviewPagination } = chefData;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        <ChefPublicProfileHeader profile={profile} />

        {/* Tab-like navigation or sections for Menu and Reviews */}
        {/* For simplicity, we'll just stack them for now. Tabs could be a future UI improvement. */}

        <section className="my-8 lg:my-12">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 border-b dark:border-gray-700 pb-3">
              منوی آشپز
            </h2>
            <ChefPublicMenuList menuItems={menu} />
          </div>
        </section>

        <section className="my-8 lg:my-12">
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 border-b dark:border-gray-700 pb-3">
              بازخوردها و امتیازات ({profile.total_reviews || 0})
            </h2>
            {/* Display average rating again or just the list */}
            {/* <div className="mb-6">
                <AverageRatingDisplay averageRating={profile.average_rating} totalReviews={profile.total_reviews} size="large" />
            </div> */}
            <ChefPublicReviewList
                initialReviews={reviews}
                initialPagination={reviewPagination}
                chefId={chefId}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
