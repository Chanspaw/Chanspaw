import { 
  Transaction, 
  PaymentMethod, 
  WalletBalance, 
  PaymentSettings, 
  ActivityLog, 
  WithdrawalRequest, 
  PaymentStats,
  PaymentAPIResponse 
} from '../types/payment';

export class PaymentAPI {
  static async getWalletBalance(): Promise<PaymentAPIResponse<WalletBalance>> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/balance`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Failed to fetch wallet balance' };
    return { success: true, data: data.data };
  }

  static async getPaymentMethods(): Promise<PaymentAPIResponse<PaymentMethod[]>> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/methods`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Failed to fetch payment methods' };
    return { success: true, data: data.data.paymentMethods };
  }

  static async createWithdrawal(amount: number, withdrawalMethod: string, accountDetails: any): Promise<PaymentAPIResponse<any>> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/withdraw`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount, withdrawalMethod, accountDetails })
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Failed to create withdrawal' };
    return { success: true, data: data.data };
  }

  static async getTransactionHistory(params: { page?: number; limit?: number; type?: string; status?: string; startDate?: Date; endDate?: Date } = {}): Promise<PaymentAPIResponse<Transaction[]>> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.type) searchParams.append('type', params.type);
    if (params.status) searchParams.append('status', params.status);
    if (params.startDate) searchParams.append('startDate', params.startDate.toISOString());
    if (params.endDate) searchParams.append('endDate', params.endDate.toISOString());
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/transactions?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Failed to fetch transactions' };
    return { success: true, data: data.data.transactions };
  }

  static async getPaymentStats(timeRange: string = '30d'): Promise<PaymentAPIResponse<any>> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/stats?timeRange=${timeRange}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Failed to fetch payment stats' };
    return { success: true, data: data.data };
  }
} 