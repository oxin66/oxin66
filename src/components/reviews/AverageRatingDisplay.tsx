import React from 'react';
// Can re-use StaticStarDisplay from ReviewListItem.tsx or create a similar one here
const StaticStarDisplaySmall: React.FC<{ rating: number; count?: number; size?: number; color?: string }> = ({
    rating,
    count = 5,
    size = 14, // Smaller stars
    color = "text-yellow-400",
  }) => {
    return (
      <div className="flex items-center" dir="ltr">
        {[...Array(count)].map((_, index) => {
          const ratingValue = index + 1;
          return (
            <svg
              key={index}
              className={`w-${Math.floor(size/4)} h-${Math.floor(size/4)} ${ // Approx Tailwind class
                ratingValue <= Math.round(rating) ? color : "text-gray-300" // Round for full/empty display
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
      </div>
    );
  };

interface AverageRatingDisplayProps {
  averageRating: number | null | undefined;
  totalReviews: number | null | undefined;
  chefId?: string; // Optional, for linking to reviews page or section
  size?: 'small' | 'medium' | 'large';
}

const AverageRatingDisplay: React.FC<AverageRatingDisplayProps> = ({
  averageRating,
  totalReviews,
  chefId,
  size = 'medium'
}) => {
  const rating = averageRating || 0;
  const reviewsCount = totalReviews || 0;

  const starSize = size === 'small' ? 14 : size === 'large' ? 24 : 18;
  const textSize = size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm';
  const numberSize = size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-md';


  if (reviewsCount === 0 && size !== 'large') { // If large, always show something for layout consistency
    return <p className={`${textSize} text-gray-500`}>هنوز بازخوردی ثبت نشده</p>;
  }
  if (reviewsCount === 0 && size === 'large') {
    return (
        <div className="flex flex-col items-center text-center" dir="rtl">
            <StaticStarDisplaySmall rating={0} size={starSize} />
            <p className={`${textSize} text-gray-500 mt-1`}>هنوز بازخوردی ثبت نشده است.</p>
        </div>
    );
  }


  return (
    <div className={`flex items-center space-x-1 space-x-reverse ${size === 'large' ? 'flex-col space-y-1 items-center' : ''}`} dir="rtl">
      <StaticStarDisplaySmall rating={rating} size={starSize} />
      <div className={`flex items-baseline ${textSize} text-gray-700 ${size === 'large' ? 'mt-1' : ''}`}>
        <span className={`font-bold ${numberSize} text-gray-800 ml-1`}>
          {rating.toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
        <span className="text-gray-500">
          ({reviewsCount.toLocaleString('fa-IR')} بازخورد)
        </span>
      </div>
      {/* Optional: Link to reviews section if chefId is provided */}
      {/* {chefId && size !== 'small' && (
        <a href={`/chef/${chefId}#reviews`} className="text-xs text-blue-500 hover:underline ml-2">مشاهده نظرات</a>
      )} */}
    </div>
  );
};

export default AverageRatingDisplay;
