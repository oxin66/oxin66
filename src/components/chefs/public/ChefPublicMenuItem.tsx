import React from 'react';
import Image from 'next/image';

// Assuming MenuItem type from a shared location or define here
// Should match the structure returned by /api/chefs/[chefId]/menu
export interface PublicMenuItemData {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  image_url?: string | null;
  tags?: string[] | null;
  preparation_time_minutes?: number | null;
  // is_available is true by default for this public view
}

interface ChefPublicMenuItemProps {
  item: PublicMenuItemData;
}

const ChefPublicMenuItem: React.FC<ChefPublicMenuItemProps> = ({ item }) => {
  const priceDisplay = item.price > 0
    ? `${item.price.toLocaleString('fa-IR')} تومان`
    : <span className="text-sm text-blue-600">تماس بگیرید</span>;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-200 rounded-lg overflow-hidden flex flex-col" dir="rtl">
      {item.image_url ? (
        <div className="w-full h-40 relative">
          <Image
            src={item.image_url}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; /* Hide if image fails */ }}
          />
        </div>
      ) : (
        <div className="w-full h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">بدون تصویر</span>
        </div>
      )}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-1">{item.name}</h3>
        {item.category && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">{item.category}</p>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 flex-grow leading-relaxed line-clamp-3" title={item.description || undefined}>
          {item.description || <span className="italic">توضیحات موجود نیست.</span>}
        </p>
        {item.tags && item.tags.length > 0 && (
            <div className="mb-2">
              {item.tags.map(tag => (
                <span key={tag} className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full mr-1 mb-1 inline-block">
                  #{tag}
                </span>
              ))}
            </div>
        )}
        <div className="mt-auto pt-2"> {/* Pushes price to the bottom */}
          <p className="text-lg font-bold text-green-600 dark:text-green-400">{priceDisplay}</p>
          {item.preparation_time_minutes !== undefined && item.preparation_time_minutes !== null && item.preparation_time_minutes > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">زمان آماده‌سازی: ~{item.preparation_time_minutes} دقیقه</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChefPublicMenuItem;
