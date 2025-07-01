const API_BASE_URL = 'http://localhost:3002/api/owner-profit';

export interface OwnerProfitStats {
  totalProfits: number;
  totalWithdrawn: number;
  availableProfits: number;
}

export interface ProfitStatistics {
  totalProfits: number;
  totalWithdrawals: number;
  netProfit: number;
  profitByGame: Record<string, number>;
  profitHistory: any[];
  withdrawalHistory: any[];
}

export interface OwnerWithdrawal {
  id: string;
  amount: number;
  method: string;
  accountDetails?: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  reason?: string;
  processedBy?: string;
  processedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  processedByUser?: {
    id: string;
    username: string;
    email: string;
  };
}

export interface WithdrawalFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

class OwnerProfitAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Get total available profits
  async getAvailableProfits(): Promise<{ success: boolean; data: OwnerProfitStats }> {
    return this.request<{ success: boolean; data: OwnerProfitStats }>('/profits/available');
  }

  // Get profit statistics
  async getProfitStatistics(timeRange: string = '30d'): Promise<{ success: boolean; data: ProfitStatistics }> {
    return this.request<{ success: boolean; data: ProfitStatistics }>(`/profits/statistics?timeRange=${timeRange}`);
  }

  // Calculate and record platform profits
  async calculateProfits(startDate: string, endDate: string): Promise<{ success: boolean; data: any }> {
    return this.request<{ success: boolean; data: any }>('/profits/calculate', {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    });
  }

  // Create owner withdrawal request
  async createWithdrawal(withdrawalData: {
    amount: number;
    method: string;
    accountDetails?: any;
    notes?: string;
  }): Promise<{ success: boolean; data: OwnerWithdrawal }> {
    return this.request<{ success: boolean; data: OwnerWithdrawal }>('/withdrawals', {
      method: 'POST',
      body: JSON.stringify(withdrawalData),
    });
  }

  // Get all owner withdrawals
  async getWithdrawals(filters: WithdrawalFilters = {}): Promise<{
    success: boolean;
    data: {
      withdrawals: OwnerWithdrawal[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    return this.request<{
      success: boolean;
      data: {
        withdrawals: OwnerWithdrawal[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      };
    }>(`/withdrawals?${params.toString()}`);
  }

  // Process owner withdrawal (approve/reject)
  async processWithdrawal(
    withdrawalId: string,
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<{ success: boolean; data: OwnerWithdrawal }> {
    return this.request<{ success: boolean; data: OwnerWithdrawal }>(`/withdrawals/${withdrawalId}/process`, {
      method: 'PUT',
      body: JSON.stringify({ action, reason }),
    });
  }

  // Complete owner withdrawal
  async completeWithdrawal(withdrawalId: string): Promise<{ success: boolean; data: OwnerWithdrawal }> {
    return this.request<{ success: boolean; data: OwnerWithdrawal }>(`/withdrawals/${withdrawalId}/complete`, {
      method: 'PUT',
    });
  }

  // Get withdrawal by ID
  async getWithdrawalById(withdrawalId: string): Promise<{ success: boolean; data: OwnerWithdrawal }> {
    return this.request<{ success: boolean; data: OwnerWithdrawal }>(`/withdrawals/${withdrawalId}`);
  }
}

export const ownerProfitAPI = new OwnerProfitAPI(); 