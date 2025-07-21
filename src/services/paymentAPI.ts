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

// Helper to fetch CSRF token
async function getCsrfToken() {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/csrf-token`, {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch CSRF token');
  const data = await response.json();
  return data.csrfToken || data.token || data._csrf || '';
}

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

  static async createDeposit(amount: number, depositMethod: string, accountDetails: any): Promise<PaymentAPIResponse<any>> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/deposit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({ amount, depositMethod, accountDetails })
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Failed to create deposit' };
    return { success: true, data: data.data };
  }

  static async createWithdrawal(amount: number | string, withdrawalMethod: string, accountDetails: any): Promise<PaymentAPIResponse<any>> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const csrfToken = await getCsrfToken();
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/withdraw`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      credentials: 'include',
      body: JSON.stringify({ amount: Number(amount), withdrawalMethod, accountDetails })
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