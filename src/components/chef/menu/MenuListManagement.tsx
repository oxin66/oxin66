'use client';

import React, { useEffect, useState, useCallback } from 'react';
import MenuItemCard from './MenuItemCard';
import MenuItemForm, { MenuItemFormData } from './MenuItemForm';
import { UserProfile } from '@/lib/userUtils'; // For chefId

interface MenuListManagementProps {
  chefProfile: UserProfile; // Pass the full chef profile
}

const MenuListManagement: React.FC<MenuListManagementProps> = ({ chefProfile }) => {
  const [menuItems, setMenuItems] = useState<MenuItemFormData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemFormData | null>(null);
  const [itemBeingDeleted, setItemBeingDeleted] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState(''); // 'true', 'false', or ''

  const fetchMenuItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (availabilityFilter !== '') params.append('is_available', availabilityFilter);

      const response = await fetch(`/api/chef/menu-items?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در دریافت لیست آیتم‌های منو');
      }
      const data = await response.json();
      setMenuItems(data.data || []);
    } catch (err) {
      setError((err as Error).message);
      setMenuItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, availabilityFilter]); // chefId is constant from props

  useEffect(() => {
    if (chefProfile.id) {
        fetchMenuItems();
    }
  }, [chefProfile.id, fetchMenuItems]);

  const handleFormSubmitSuccess = (menuItemData: any) => {
    fetchMenuItems(); // Refetch list after add/edit
    setShowForm(false);
    setEditingItem(null);
  };

  const handleEditItem = (menuItem: MenuItemFormData) => {
    setEditingItem(menuItem);
    setShowForm(true);
  };

  const handleDeleteItem = async (itemId: string, imagePath?: string | null) => {
    setItemBeingDeleted(itemId);
    try {
      // API route for DELETE /api/chef/menu-items/[itemId] handles image deletion from storage
      const response = await fetch(`/api/chef/menu-items/${itemId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'خطا در حذف آیتم منو');
      }
      alert('آیتم منو با موفقیت حذف شد.');
      fetchMenuItems(); // Refetch list
    } catch (err) {
      setError((err as Error).message);
      alert(`خطا در حذف: ${(err as Error).message}`);
    } finally {
        setItemBeingDeleted(null);
    }
  };

  const openNewItemForm = () => {
    setEditingItem(null); // Ensure not editing
    setShowForm(true);
  };


  if (isLoading && menuItems.length === 0) {
    return (
        <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">در حال بارگذاری منو...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex flex-wrap gap-3 items-end">
            <div>
                <label htmlFor="menuCatFilter" className="block text-xs font-medium text-gray-700 mb-1">دسته‌بندی:</label>
                <input type="text" id="menuCatFilter" value={categoryFilter}
                       onChange={(e) => setCategoryFilter(e.target.value)}
                       placeholder="مثلا: غذای اصلی"
                       className="p-2 text-sm border border-gray-300 rounded-md shadow-sm min-w-[150px]" />
            </div>
            <div>
                <label htmlFor="menuAvailFilter" className="block text-xs font-medium text-gray-700 mb-1">وضعیت:</label>
                <select id="menuAvailFilter" value={availabilityFilter}
                        onChange={(e) => setAvailabilityFilter(e.target.value)}
                        className="p-2 text-sm border border-gray-300 rounded-md shadow-sm bg-white min-w-[120px]">
                    <option value="">همه</option>
                    <option value="true">در دسترس</option>
                    <option value="false">ناموجود</option>
                </select>
            </div>
        </div>
        <button
          onClick={openNewItemForm}
          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors"
        >
          افزودن آیتم جدید به منو
        </button>
      </div>

      {showForm && (
        <div className="my-6 p-0 md:p-4 border-t border-b md:border md:rounded-lg md:shadow-sm bg-gray-50">
          <MenuItemForm
            chefId={chefProfile.id}
            initialData={editingItem || { is_available: true }} // Pass empty for new, or item data for edit
            onSubmitSuccess={handleFormSubmitSuccess}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
            isEditing={!!editingItem}
          />
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-center" role="alert">
          <p className="font-bold">خطا</p><p>{error}</p>
        </div>
      )}

      {isLoading && <p className="text-center text-gray-500 py-4">در حال به‌روزرسانی لیست منو...</p>}

      {!isLoading && menuItems.length === 0 && !showForm && (
        <div className="text-center py-10 bg-white rounded-lg shadow p-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <p className="mt-3 text-gray-600">
            هنوز هیچ آیتمی به منوی خود اضافه نکرده‌اید یا موردی با فیلترهای انتخاب شده یافت نشد.
          </p>
          {!categoryFilter && !availabilityFilter && ( // Show only if no filters are active
            <button onClick={openNewItemForm} className="mt-4 text-sm text-white bg-green-500 hover:bg-green-600 py-2 px-4 rounded-md">
                افزودن اولین آیتم
            </button>
          )}
        </div>
      )}

      {menuItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {menuItems.map((item) => (
            <MenuItemCard
                key={item.id}
                menuItem={item}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                isDeleting={itemBeingDeleted === item.id}
            />
            ))}
        </div>
      )}
    </div>
  );
};

export default MenuListManagement;
