import React from 'react';
import Image from 'next/image';
import { UserProfile } from '@/lib/userUtils'; // Assuming UserProfile is comprehensive
import AverageRatingDisplay from '@/components/reviews/AverageRatingDisplay'; // Re-use

interface ChefPublicProfileHeaderProps {
  profile: UserProfile; // Should contain all necessary fields like fullName, kitchen_name, bio, avatarUrl, specialties, average_rating, total_reviews
}

const ChefPublicProfileHeader: React.FC<ChefPublicProfileHeaderProps> = ({ profile }) => {
  const displayName = profile.kitchen_name || profile.fullName || 'آشپز';
  const specialties = profile.specialties && profile.specialties.length > 0
    ? profile.specialties.join('، ')
    : 'تخصص خاصی ثبت نشده است.';

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 md:p-8 mb-8 text-center md:text-right" dir="rtl">
      <div className="md:flex md:items-center md:space-x-6 md:space-x-reverse">
        {/* Avatar */}
        <div className="mx-auto md:mx-0 mb-4 md:mb-0 w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden relative border-4 border-gray-200 dark:border-gray-700 shadow-md">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={`آواتار ${displayName}`}
              layout="fill"
              objectFit="cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-4xl text-gray-500 dark:text-gray-400">{displayName.substring(0,1)}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">{displayName}</h1>
          {profile.kitchen_name && profile.fullName && profile.kitchen_name !== profile.fullName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">(توسط: {profile.fullName})</p>
          )}

          <div className="mb-4">
            <AverageRatingDisplay
              averageRating={profile.average_rating}
              totalReviews={profile.total_reviews}
              size="medium" // Or 'large' for more prominence
            />
          </div>

          {profile.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              {profile.bio}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold">تخصص‌ها:</span> {specialties}
          </p>

          {/* Placeholder for future actions like "Contact Chef" or "Request Quote" if applicable */}
          {/* <div className="mt-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">
              ارسال پیام (به زودی)
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default ChefPublicProfileHeader;
