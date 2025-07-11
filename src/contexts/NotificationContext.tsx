'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClientComponentClient, Session } from '@supabase/auth-helpers-nextjs'; // For client-side Supabase
import { UserProfile } from '@/lib/userUtils'; // Assuming you might need user profile context too

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link_to?: string | null;
  is_read: boolean;
  created_at: string;
  metadata?: any | null;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (page?: number, limit?: number) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  session: Session | null; // Pass session to know if user is logged in
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, session }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient(); // Client component Supabase client

  const calculateUnreadCount = (notifs: Notification[]) => {
    return notifs.filter(n => !n.is_read).length;
  };

  const fetchNotifications = useCallback(async (page = 1, limit = 7) => { // Fetch fewer for dropdown
    if (!session?.user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications?page=${page}&limit=${limit}`); // Use your API
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      const fetchedNotifs = data.data || [];
      setNotifications(fetchedNotifs);
      setUnreadCount(calculateUnreadCount(fetchedNotifs)); // Initial count from fetched data

      // More accurate unread count directly from an aggregate if API supports it, or count all unread
      // For now, this count is based on the fetched (potentially paginated) list.
      // A separate API to get just the unread count might be better.
      // Let's refine: fetchNotifications gets a small list for display, but unreadCount should be total.
      const { count, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);
      if (countError) console.error("Error fetching unread count:", countError);
      else setUnreadCount(count || 0);

    } catch (error) {
      console.error("NotificationContext fetch error:", error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    if (session?.user) {
      fetchNotifications(); // Initial fetch on login or page load with session

      const channel = supabase
        .channel(`realtime-notifications-for-${session.user.id}`)
        .on<Notification>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            console.log('Realtime: New notification received!', payload);
            const newNotification = payload.new as Notification;
            // Add to the start of the list and update unread count
            setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep max 10 in dropdown list
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          }
        )
        .on<Notification>( // Listen for updates to is_read status
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${session.user.id}`
            },
            (payload) => {
                console.log('Realtime: Notification updated (is_read changed)!', payload);
                const updatedNotification = payload.new as Notification;
                setNotifications(prev =>
                    prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
                );
                // Recalculate unread count based on the current list or re-fetch count
                // For simplicity, refetching count is more robust here.
                fetchNotifications(); // This will also refetch the list, which is fine for now.
            }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to realtime notifications for user ${session.user.id}`);
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Notification subscription error:', err || status);
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
        // User logged out or no session
        setNotifications([]);
        setUnreadCount(0);
    }
  }, [session, supabase, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Failed to mark as read');
      // Optimistic update or rely on realtime update
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1)); // Decrement, ensure not negative
    } catch (error) {
      console.error("Mark as read error:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to mark all as read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Mark all as read error:", error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
