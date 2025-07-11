import React from 'react';

interface SkeletonCardProps {
  className?: string;
  rows?: number; // Number of text line skeletons
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '', rows = 3 }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-3 animate-pulse ${className}`} dir="rtl">
      <div className="flex space-x-3 space-x-reverse items-center">
        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        <div className="flex-1 space-y-2 py-1">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
      {Array.from({ length: rows -1 > 0 ? rows -1 : 1 }).map((_, index) => ( // Ensure at least one line if rows < 1 for some reason
         index === 0 && <div key={`line-${index}`} className="mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div> ||
         index > 0 && <div key={`line-${index}`} className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded w-11/12"></div>
      ))}
      <div className="mt-3 flex justify-between items-center">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </div>
    </div>
  );
};

// A simpler skeleton for text lines
export const SkeletonText: React.FC<{ lines?: number, className?: string }> = ({ lines = 1, className="" }) => {
    return (
        <div className={`space-y-2 animate-pulse ${className}`}>
            {Array.from({length: lines}).map((_, i) => (
                <div key={i} className={`h-3 bg-gray-200 dark:bg-gray-700 rounded ${i > 0 ? 'w-5/6' : 'w-full'}`}></div>
            ))}
        </div>
    );
};


export default SkeletonCard;
