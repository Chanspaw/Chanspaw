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

// Mock data storage (in real app, this would be a database)
let transactions: Transaction[] = [];
let paymentMethods: PaymentMethod[] = [];
let walletBalances: WalletBalance[] = [];
let paymentSettings: PaymentSettings[] = [];
let activityLogs: ActivityLog[] = [];
let withdrawalRequests: WithdrawalRequest[] = [];

// Initialize with some mock data
const initializeMockData = () => {
  // Mock payment methods
  paymentMethods = [
    {
      id: '1',
      type: 'stripe',
      name: 'Credit/Debit Card',
      isEnabled: true,
      config: {
        apiKey: 'pk_test_...',
        secretKey: 'sk_test_...',
        currency: 'USD',
        minAmount: 10,
        maxAmount: 10000
      }
    },
    {
      id: '2',
      type: 'paypal',
      name: 'PayPal',
      isEnabled: true,
      config: {
        apiKey: 'paypal_client_id_...',
        currency: 'USD',
        minAmount: 5,
        maxAmount: 5000
      }
    },
    {
      id: '3',
      type: 'crypto',
      name: 'Cryptocurrency',
      isEnabled: false,
      config: {
        currency: 'USD',
        minAmount: 50,
        maxAmount: 10000
      }
    }
  ];

  // Mock payment settings
  paymentSettings = [
    {
      id: '1',
      key: 'STRIPE_PUBLIC_KEY',
      value: 'pk_test_...',
      description: 'Stripe Public Key',
      isSecret: false,
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      key: 'STRIPE_SECRET_KEY',
      value: 'sk_test_...',
      description: 'Stripe Secret Key',
      isSecret: true,
      updatedAt: new Date().toISOString()
    },
    {
      id: '3',
      key: 'PAYPAL_CLIENT_ID',
      value: 'paypal_client_id_...',
      description: 'PayPal Client ID',
      isSecret: false,
      updatedAt: new Date().toISOString()
    }
  ];
};

// Initialize mock data
initializeMockData();

// Utility function to log activities
const logActivity = (action: string, details: string, userId?: string, adminId?: string) => {
  const log: ActivityLog = {
    id: Math.random().toString(36).substr(2, 9),
    userId,
    adminId,
    action,
    details,
    ipAddress: '127.0.0.1', // In real app, get from request
    userAgent: 'Mozilla/5.0...', // In real app, get from request
    createdAt: new Date().toISOString()
  };
  activityLogs.unshift(log);
  return log;
};

// Utility function to generate transaction ID
const generateTransactionId = () => `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Payment API Service
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