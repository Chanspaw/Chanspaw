const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface Friend {
  id: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  lastLogin?: string;
}

export interface FriendRequest {
  id: string;
  sender: Friend;
  message?: string;
  createdAt: string;
}

export interface SearchResult {
  id: string;
  username: string;
  avatar: string;
  status: 'online' | 'offline';
  createdAt: string;
}

class FriendAPI {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('chanspaw_access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get friends list
  async getFriends(): Promise<{ success: boolean; data?: { friends: Friend[] }; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/list`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error fetching friends:', error);
      return { success: false, error: 'Failed to load friends' };
    }
  }

  // Get received friend requests
  async getReceivedRequests(): Promise<{ success: boolean; data?: { requests: FriendRequest[] }; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/requests/received`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      return { success: false, error: 'Failed to load friend requests' };
    }
  }

  // Get sent friend requests
  async getSentRequests(): Promise<{ success: boolean; data?: { requests: FriendRequest[] }; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/requests/sent`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error fetching sent requests:', error);
      return { success: false, error: 'Failed to load sent requests' };
    }
  }

  // Search users
  async searchUsers(query: string): Promise<{ success: boolean; data?: { users: SearchResult[] }; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/search?query=${encodeURIComponent(query)}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data: data.data };
    } catch (error) {
      console.error('Error searching users:', error);
      return { success: false, error: 'Failed to search users' };
    }
  }

  // Send friend request
  async sendFriendRequest(receiverId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/request`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ receiverId })
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send friend request' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: 'Network error while sending friend request' };
    }
  }

  // Accept friend request
  async acceptFriendRequest(requestId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/accept/${requestId}`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to accept friend request' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error accepting friend request:', error);
      return { success: false, error: 'Network error while accepting friend request' };
    }
  }

  // Reject friend request
  async rejectFriendRequest(requestId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/reject/${requestId}`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to reject friend request' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      return { success: false, error: 'Network error while rejecting friend request' };
    }
  }

  // Remove friend
  async removeFriend(friendId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/remove/${friendId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to remove friend' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      console.error('Error removing friend:', error);
      return { success: false, error: 'Network error while removing friend' };
    }
  }

  // Cancel sent friend request
  async cancelFriendRequest(requestId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/friends/reject/${requestId}`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to cancel friend request' };
      }

      return { success: true, message: 'Friend request cancelled' };
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      return { success: false, error: 'Network error while cancelling friend request' };
    }
  }
}

export const friendAPI = new FriendAPI(); 