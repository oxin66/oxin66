'use client';

import React, { useEffect, useState, useCallback } from 'react';
import UserManagementListItem, { UserForAdminList } from './UserManagementListItem';

interface PaginationData {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

const UserManagementList: React.FC = () => {
  const [users, setUsers] = useState<UserForAdminList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('');
  const [verificationStatusFilter, setVerificationStatusFilter] = useState(''); // For chefs
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTermDebounced, setSearchTermDebounced] = useState('');

  // Debounce search query
  useEffect(() => {
    const timerId = setTimeout(() => {
      setSearchTermDebounced(searchQuery);
    }, 500); // 500ms delay
    return () => clearTimeout(timerId);
  }, [searchQuery]);

  const fetchUsers = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.pageSize),
      });
      if (roleFilter) params.append('role', roleFilter);
      if (accountStatusFilter) params.append('status', accountStatusFilter); // API uses 'status' for account_status
      if (verificationStatusFilter && roleFilter === 'chef') params.append('verification', verificationStatusFilter);
      if (searchTermDebounced) params.append('q', searchTermDebounced);

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'خطا در دریافت لیست کاربران');
      }
      const data = await response.json();
      setUsers(data.data || []);
      setPagination(data.pagination || { currentPage: 1, pageSize: pagination.pageSize, totalItems: 0, totalPages: 1 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.';
      setError(errorMessage);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageSize, roleFilter, accountStatusFilter, verificationStatusFilter, searchTermDebounced]);

  useEffect(() => {
    // Reset to page 1 when filters change, then fetch
    setPagination(prev => ({...prev, currentPage: 1}));
    fetchUsers(1);
  }, [roleFilter, accountStatusFilter, verificationStatusFilter, searchTermDebounced, fetchUsers]); // fetchUsers will be stable if its own deps are


  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
        // setPagination(prev => ({...prev, currentPage: newPage})); // fetchUsers will update pagination from API response
        fetchUsers(newPage);
    }
  };

  const rolesForFilter = [
    { value: '', label: 'همه نقش‌ها' },
    { value: 'user', label: 'کاربر عادی' },
    { value: 'chef', label: 'آشپز' },
    { value: 'admin', label: 'ادمین' },
  ];
  const accountStatusesForFilter = [
    { value: '', label: 'همه وضعیت‌های حساب' },
    { value: 'active', label: 'فعال' },
    { value: 'suspended', label: 'معلق' },
    { value: 'banned_by_admin', label: 'مسدود شده' },
  ];
  const chefVerificationStatusesForFilter = [
    { value: '', label: 'همه وضعیت‌های تأیید' },
    { value: 'pending_review', label: 'در انتظار بررسی' },
    { value: 'approved', label: 'تأیید شده' },
    { value: 'rejected', label: 'رد شده' },
    { value: 'needs_more_info', label: 'نیاز به اطلاعات بیشتر' },
  ];


  if (isLoading && users.length === 0) {
    return (
        <div className="text-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">در حال بارگذاری لیست کاربران...</p>
        </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label htmlFor="searchUserQuery" className="block text-sm font-medium text-gray-700 mb-1">جستجو (نام/ایمیل):</label>
          <input
            type="text"
            id="searchUserQuery"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو..."
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">نقش:</label>
          <select id="roleFilter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white">
            {rolesForFilter.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="accountStatusFilter" className="block text-sm font-medium text-gray-700 mb-1">وضعیت حساب:</label>
          <select id="accountStatusFilter" value={accountStatusFilter} onChange={(e) => setAccountStatusFilter(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white">
            {accountStatusesForFilter.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        {roleFilter === 'chef' && (
          <div>
            <label htmlFor="verificationStatusFilter" className="block text-sm font-medium text-gray-700 mb-1">وضعیت تأیید (آشپز):</label>
            <select id="verificationStatusFilter" value={verificationStatusFilter} onChange={(e) => setVerificationStatusFilter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white">
              {chefVerificationStatusesForFilter.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md text-center" role="alert">
          <p className="font-bold">خطا</p>
          <p>{error}</p>
        </div>
      )}
      {isLoading && <p className="text-center text-gray-500 py-4">در حال به‌روزرسانی لیست کاربران...</p>}

      {!isLoading && users.length === 0 && (
        <div className="text-center py-10 bg-white rounded-lg shadow p-6">
           <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0zM17 14a2 2 0 10-4 0v1h4v-1zM13 14a2 2 0 10-4 0v1h4v-1z" />
          </svg>
          <p className="mt-3 text-gray-600">هیچ کاربری با فیلترهای انتخاب شده یافت نشد.</p>
        </div>
      )}

      <div className="space-y-3">
        {users.map((user) => (
          <UserManagementListItem key={user.id} user={user} />
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 space-x-reverse mt-8 pb-4" dir="rtl">
          <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1 || isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50">قبلی</button>
          <span className="text-gray-700">
            صفحه {pagination.currentPage.toLocaleString('fa-IR')} از {pagination.totalPages.toLocaleString('fa-IR')} (کل: {pagination.totalItems.toLocaleString('fa-IR')})
          </span>
          <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages || isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50">بعدی</button>
        </div>
      )}
    </div>
  );
};

export default UserManagementList;
