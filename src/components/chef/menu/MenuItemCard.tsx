'use client';

import React from 'react';
import Image from 'next/image';
import { MenuItemFormData } from './MenuItemForm'; // Re-use type, assuming it includes 'id'

interface MenuItemCardProps {
  menuItem: MenuItemFormData; // Should have id
  onEdit: (menuItem: MenuItemFormData) => void;
  onDelete: (itemId: string, imagePath?: string | null) => Promise<void>; // Pass imagePath for deletion from storage
  isDeleting?: boolean; // To show loading state on delete button for this specific item
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ menuItem, onEdit, onDelete, isDeleting }) => {
  const priceDisplay = menuItem.price !== undefined && menuItem.price !== null
    ? `${menuItem.price.toLocaleString('fa-IR')} تومان`
    : 'قیمت نامشخص';

  const handleDelete = async () => {
    if (menuItem.id && confirm(`آیا از حذف آیتم "${menuItem.name}" مطمئن هستید؟`)) {
        // Extract storage path from image_url if possible.
        // This is a simplified example. Robust parsing or storing path separately is better.
        let storagePath: string | undefined = undefined;
        if (menuItem.image_url) {
            try {
                const url = new URL(menuItem.image_url);
                // Example path extraction: /storage/v1/object/public/menu-item-images/chef_id/item_id/image.png
                // This depends on your bucket being public and the structure.
                const pathParts = url.pathname.split('/menu-item-images/');
                if (pathParts.length > 1) {
                    storagePath = pathParts[1];
                }
            } catch (e) {
                console.warn("Could not parse image_url to get storage path:", menuItem.image_url);
            }
        }
        await onDelete(menuItem.id, storagePath);
    }
  };


  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden flex flex-col md:flex-row" dir="rtl">
      {menuItem.image_url ? (
        <div className="w-full md:w-1/3 h-48 md:h-auto relative">
          <Image
            src={menuItem.image_url}
            alt={menuItem.name || 'تصویر غذا'}
            layout="fill"
            objectFit="cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; /* Hide if image fails */ }}
          />
        </div>
      ) : (
        <div className="w-full md:w-1/3 h-48 md:h-auto bg-gray-100 flex items-center justify-center">
          <span className="text-sm text-gray-400">بدون تصویر</span>
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-lg font-bold text-gray-800 mb-1">{menuItem.name}</h4>
          {menuItem.category && (
            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full mb-2 inline-block">
              {menuItem.category}
            </span>
          )}
          <p className="text-sm text-gray-600 mb-2 leading-relaxed line-clamp-2" title={menuItem.description || undefined}>
            {menuItem.description || <span className="italic">بدون توضیحات</span>}
          </p>
          <p className="text-md font-semibold text-green-600 mb-1">{priceDisplay}</p>
          {menuItem.preparation_time_minutes !== undefined && menuItem.preparation_time_minutes !== null && (
            <p className="text-xs text-gray-500">زمان آماده‌سازی: {menuItem.preparation_time_minutes} دقیقه</p>
          )}
          {menuItem.tags && menuItem.tags.length > 0 && (
            <div className="mt-2">
              {menuItem.tags.map(tag => (
                <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full mr-1 mb-1 inline-block">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100">
          <span className={`px-2 py-0.5 text-xs rounded-full self-start sm:self-center ${
            menuItem.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {menuItem.is_available ? 'در دسترس' : 'فعلاً ناموجود'}
          </span>
          <div className="flex-grow sm:flex-grow-0 flex gap-2">
            <button
                onClick={() => onEdit(menuItem)}
                className="w-full sm:w-auto text-xs bg-yellow-500 hover:bg-yellow-600 text-white py-1.5 px-3 rounded-md transition-colors"
            >
                ویرایش
            </button>
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto text-xs bg-red-500 hover:bg-red-600 text-white py-1.5 px-3 rounded-md transition-colors disabled:bg-gray-300"
            >
                {isDeleting ? 'درحال حذف...' : 'حذف'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
