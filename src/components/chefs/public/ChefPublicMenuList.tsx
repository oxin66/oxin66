'use client'; // If we add client-side filtering/sorting in future

import React, { useState, useMemo } from 'react';
import ChefPublicMenuItem, { PublicMenuItemData } from './ChefPublicMenuItem';

interface ChefPublicMenuListProps {
  menuItems: PublicMenuItemData[];
}

const ChefPublicMenuList: React.FC<ChefPublicMenuListProps> = ({ menuItems }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    if (!selectedCategory) return menuItems;
    return menuItems.filter(item => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  if (!menuItems || menuItems.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <p className="mt-3 text-gray-600 dark:text-gray-400">این آشپز هنوز منویی ثبت نکرده یا آیتم‌های منوی او در حال حاضر در دسترس نیستند.</p>
      </div>
    );
  }

  return (
    <div dir="rtl">
      {categories.length > 1 && ( // Show category filters only if there's more than one category
        <div className="mb-6 flex flex-wrap gap-2 justify-center sm:justify-start border-b pb-3 dark:border-gray-700">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors ${
              !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            همه دسته‌بندی‌ها
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors ${
                selectedCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {filteredMenuItems.length === 0 && selectedCategory && (
         <div className="text-center py-6">
            <p className="text-gray-500 dark:text-gray-400">هیچ آیتمی در دسته‌بندی "{selectedCategory}" یافت نشد.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredMenuItems.map(item => (
          <ChefPublicMenuItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default ChefPublicMenuList;
