export interface PaymentMethod {
  id: string;
  type: 'stripe' | 'paypal' | 'crypto' | 'bank_transfer';
  name: string;
  isEnabled: boolean;
  config: {
    apiKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    currency?: string;
    minAmount?: number;
    maxAmount?: number;
  };
}

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  type: 'deposit' | 'withdrawal' | 'adjustment' | 'game_win' | 'game_loss';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'rejected';
  paymentMethod?: string;
  reference?: string;
  description: string;
  metadata?: {
    gameId?: string;
    gameName?: string;
    adminId?: string;
    adminNote?: string;
    paymentProvider?: string;
    transactionId?: string;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface WalletBalance {
  userId: string;
  username: string;
  balance: number;
  currency: string;
  lastUpdated: string;
  isLocked: boolean;
  lockReason?: string;
  real_balance: number;
  virtual_balance: number;
}

export interface PaymentSettings {
  id: string;
  key: string;
  value: string;
  description: string;
  isSecret: boolean;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  adminId?: string;
  action: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  accountDetails: {
    accountNumber?: string;
    routingNumber?: string;
    paypalEmail?: string;
    cryptoAddress?: string;
    bankName?: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface PaymentStats {
  totalDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalUsers: number;
  averageBalance: number;
  currency: string;
}

export interface PaymentAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
} 