import React from 'react';
// A component to display stars based on a rating value
// Could be a simplified version of StarRatingInput or a new one.
const StaticStarDisplay: React.FC<{ rating: number; count?: number; size?: number; color?: string }> = ({
  rating,
  count = 5,
  size = 16, // Smaller stars for display
  color = "text-yellow-400",
}) => {
  return (
    <div className="flex items-center" dir="ltr">
      {[...Array(count)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <svg
            key={index}
            className={`w-${Math.floor(size/4)} h-${Math.floor(size/4)} ${
              ratingValue <= rating ? color : "text-gray-300"
            }`}
            style={{ width: `${size}px`, height: `${size}px` }}
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
          </svg>
        );
      })}
      <span className="ml-1 text-sm text-gray-600 font-semibold" dir="rtl">({rating.toLocaleString('fa-IR')} از ۵)</span>
    </div>
  );
};


export interface ReviewUserProfile {
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface ReviewItemData {
  id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  userProfile?: ReviewUserProfile | null; // User who wrote the review
  // order_id might also be useful here for admin views or linking
}

interface ReviewListItemProps {
  review: ReviewItemData;
}

const ReviewListItem: React.FC<ReviewListItemProps> = ({ review }) => {
  const formattedDate = new Date(review.created_at).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const userName = review.userProfile?.full_name || 'کاربر ناشناس';
  // const userAvatar = review.userProfile?.avatar_url;

  return (
    <div className="p-4 border-b border-gray-200 bg-white" dir="rtl">
      <div className="flex items-start space-x-3 space-x-reverse">
        {/* Avatar placeholder */}
        {/* {userAvatar ? (
            <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full object-cover" />
        ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
                {userName.substring(0,1)}
            </div>
        )} */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-gray-800">{userName}</p>
            <StaticStarDisplay rating={review.rating} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5 sm:mt-0">{formattedDate}</p>
          {review.comment && (
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {review.comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewListItem;
