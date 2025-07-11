'use client';

import React, { useState } from 'react';

interface StarRatingInputProps {
  count?: number; // Number of stars
  initialRating?: number;
  onRatingChange: (rating: number) => void;
  size?: number; // Size of the stars in pixels
  color?: string;
  hoverColor?: string;
  disabled?: boolean;
}

const StarRatingInput: React.FC<StarRatingInputProps> = ({
  count = 5,
  initialRating = 0,
  onRatingChange,
  size = 28,
  color = "text-gray-300", // Default color for empty star
  hoverColor = "text-yellow-400", // Color for filled/hovered star
  disabled = false,
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(initialRating);

  const handleClick = (newRating: number) => {
    if (disabled) return;
    setRating(newRating);
    onRatingChange(newRating);
  };

  return (
    <div className="flex items-center" dir="ltr"> {/* dir="ltr" to ensure stars are LTR */}
      {[...Array(count)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <label key={index} className={`cursor-pointer ${disabled ? 'cursor-not-allowed' : ''}`}>
            <input
              type="radio"
              name="rating"
              value={ratingValue}
              onClick={() => handleClick(ratingValue)}
              className="hidden" // Hide the actual radio button
              disabled={disabled}
            />
            <svg
              className={`w-${Math.floor(size/4)} h-${Math.floor(size/4)} ${ // Tailwind needs w-7 h-7 for 28px approx.
                ratingValue <= (hover || rating) ? hoverColor : color
              } transition-colors duration-150`}
              style={{ width: `${size}px`, height: `${size}px` }} // Inline style for precise size
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              onMouseEnter={() => !disabled && setHover(ratingValue)}
              onMouseLeave={() => !disabled && setHover(null)}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
            </svg>
          </label>
        );
      })}
    </div>
  );
};

export default StarRatingInput;
