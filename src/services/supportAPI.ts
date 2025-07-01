const API_BASE_URL = import.meta.env.VITE_API_URL + '/api';

export interface SupportMessage {
  id: string;
  userId: string;
  username: string;
  userEmail: string;
  type: 'contact_form' | 'live_chat' | 'support_ticket';
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'responded' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'gaming' | 'wallet' | 'technical' | 'account' | 'general';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  adminResponse?: string;
  chatHistory?: Array<{
    id: string;
    sender: 'user' | 'admin';
    message: string;
    timestamp: Date;
  }>;
}

export interface CreateSupportMessageRequest {
  subject: string;
  message: string;
  type: SupportMessage['type'];
  category: SupportMessage['category'];
  priority?: SupportMessage['priority'];
}

export interface SupportResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

class SupportAPIService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('chanspaw_access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Create a new support message
  async createSupportMessage(data: CreateSupportMessageRequest): Promise<SupportResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/support/messages`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating support message:', error);
      return {
        success: false,
        error: 'Failed to create support message'
      };
    }
  }

  // Get all support messages (admin only)
  async getSupportMessages(): Promise<SupportResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/support/messages`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching support messages:', error);
      return {
        success: false,
        error: 'Failed to fetch support messages'
      };
    }
  }

  // Get support messages for current user
  async getUserSupportMessages(): Promise<SupportResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/support/messages/user`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching user support messages:', error);
      return {
        success: false,
        error: 'Failed to fetch user support messages'
      };
    }
  }

  // Get a specific support message
  async getSupportMessage(messageId: string): Promise<SupportResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/support/messages/${messageId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching support message:', error);
      return {
        success: false,
        error: 'Failed to fetch support message'
      };
    }
  }

  // Update support message status (admin only)
  async updateSupportMessageStatus(messageId: string, status: SupportMessage['status']): Promise<SupportResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/support/messages/${messageId}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating support message status:', error);
      return {
        success: false,
        error: 'Failed to update support message status'
      };
    }
  }

  // Respond to support message (admin only)
  async respondToSupportMessage(messageId: string, response: string): Promise<SupportResponse> {
    try {
      const responseData = await fetch(`${API_BASE_URL}/support/messages/${messageId}/respond`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ response })
      });

      const result = await responseData.json();
      return result;
    } catch (error) {
      console.error('Error responding to support message:', error);
      return {
        success: false,
        error: 'Failed to respond to support message'
      };
    }
  }

  // Add chat message to support conversation
  async addChatMessage(messageId: string, message: string): Promise<SupportResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/support/messages/${messageId}/chat`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ message })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error adding chat message:', error);
      return {
        success: false,
        error: 'Failed to add chat message'
      };
    }
  }

  // Get support statistics (admin only)
  async getSupportStats(): Promise<SupportResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/support/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching support stats:', error);
      return {
        success: false,
        error: 'Failed to fetch support stats'
      };
    }
  }
}

// Create and export a single instance
export const supportAPI = new SupportAPIService(); 