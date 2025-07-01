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
      // For now, we'll create mock notifications based on friend requests
      const requestsResult = await friendAPI.getReceivedRequests();
      if (requestsResult.success && requestsResult.data) {
        const friendRequestNotifications: FriendNotification[] = requestsResult.data.requests.map(req => ({
          id: req.id,
          type: 'friend_request',
          message: `${req.sender.username} sent you a friend request`,
          timestamp: req.createdAt,
          read: false,
          data: req
        }));
        
        setNotifications(friendRequestNotifications);
        setUnreadCount(friendRequestNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading friend notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
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