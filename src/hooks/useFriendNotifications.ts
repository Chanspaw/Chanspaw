import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { friendAPI } from '../services/friendAPI';

export interface FriendNotification {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'friend_online' | 'friend_offline';
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

export function useFriendNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<FriendNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications on mount
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
      const res = await fetch('/api/notifications/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.data?.notifications) {
        setNotifications((data.data.notifications as any[]));
        setUnreadCount((data.data.notifications as any[]).filter((n: any) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error loading friend notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(notif => notif.id === notificationId ? { ...notif, isRead: true } : notif));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
    setUnreadCount(0);
  };

  const addNotification = (notification: FriendNotification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAllNotifications,
    refreshNotifications: loadNotifications
  };
} 