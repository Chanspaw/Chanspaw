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
  // User-side methods
  static async getWalletBalance(userId: string): Promise<PaymentAPIResponse<WalletBalance>> {
    try {
      let balance = walletBalances.find(b => b.userId === userId);
      
      if (!balance) {
        balance = {
          userId,
          username: 'User', // In real app, get from user service
          balance: 0,
          currency: 'USD',
          lastUpdated: new Date().toISOString(),
          isLocked: false
        };
        walletBalances.push(balance);
      }

      logActivity('WALLET_BALANCE_VIEWED', `User ${userId} viewed wallet balance`, userId);
      
      return {
        success: true,
        data: balance
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get wallet balance'
      };
    }
  }

  static async getTransactionHistory(userId: string, limit = 20): Promise<PaymentAPIResponse<Transaction[]>> {
    try {
      const userTransactions = transactions
        .filter(t => t.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

      logActivity('TRANSACTION_HISTORY_VIEWED', `User ${userId} viewed transaction history`, userId);
      
      return {
        success: true,
        data: userTransactions
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get transaction history'
      };
    }
  }

  static async createDeposit(userId: string, amount: number, paymentMethod: string): Promise<PaymentAPIResponse<Transaction>> {
    try {
      // Validate amount
      if (amount <= 0) {
        return {
          success: false,
          error: 'Invalid amount'
        };
      }

      // Check payment method
      const method = paymentMethods.find(m => m.id === paymentMethod && m.isEnabled);
      if (!method) {
        return {
          success: false,
          error: 'Payment method not available'
        };
      }

      // Create transaction
      const transaction: Transaction = {
        id: generateTransactionId(),
        userId,
        username: 'User', // In real app, get from user service
        type: 'deposit',
        amount,
        currency: 'USD',
        status: 'pending',
        paymentMethod: method.name,
        description: `Deposit via ${method.name}`,
        metadata: {
          paymentProvider: method.type
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transactions.push(transaction);
      logActivity('DEPOSIT_CREATED', `User ${userId} created deposit of $${amount}`, userId);

      // In real app, redirect to payment provider
      // For now, simulate successful payment after 2 seconds
      setTimeout(() => {
        this.completeDeposit(transaction.id);
      }, 2000);

      return {
        success: true,
        data: transaction,
        message: 'Deposit initiated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create deposit'
      };
    }
  }

  static async createWithdrawal(userId: string, amount: number, paymentMethod: string, accountDetails: any): Promise<PaymentAPIResponse<WithdrawalRequest>> {
    try {
      // Validate amount
      if (amount <= 0) {
        return {
          success: false,
          error: 'Invalid amount'
        };
      }

      // Check user balance
      const balance = walletBalances.find(b => b.userId === userId);
      if (!balance || balance.balance < amount) {
        return {
          success: false,
          error: 'Insufficient funds'
        };
      }

      // Create withdrawal request
      const withdrawal: WithdrawalRequest = {
        id: Math.random().toString(36).substr(2, 9),
        userId,
        username: 'User', // In real app, get from user service
        amount,
        currency: 'USD',
        paymentMethod,
        accountDetails,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      withdrawalRequests.push(withdrawal);
      logActivity('WITHDRAWAL_REQUESTED', `User ${userId} requested withdrawal of $${amount}`, userId);

      return {
        success: true,
        data: withdrawal,
        message: 'Withdrawal request submitted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to create withdrawal request'
      };
    }
  }

  // Admin-side methods
  static async getPaymentStats(): Promise<PaymentAPIResponse<PaymentStats>> {
    try {
      const totalDeposits = transactions
        .filter(t => t.type === 'deposit' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalWithdrawals = transactions
        .filter(t => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      const pendingWithdrawals = withdrawalRequests
        .filter(w => w.status === 'pending')
        .reduce((sum, w) => sum + w.amount, 0);

      const totalUsers = walletBalances.length;
      const averageBalance = totalUsers > 0 
        ? walletBalances.reduce((sum, b) => sum + b.balance, 0) / totalUsers 
        : 0;

      const stats: PaymentStats = {
        totalDeposits,
        totalWithdrawals,
        pendingWithdrawals,
        totalUsers,
        averageBalance,
        currency: 'USD'
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get payment stats'
      };
    }
  }

  static async getAllTransactions(limit = 50): Promise<PaymentAPIResponse<Transaction[]>> {
    try {
      const allTransactions = transactions
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

      return {
        success: true,
        data: allTransactions
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get transactions'
      };
    }
  }

  static async getPendingWithdrawals(): Promise<PaymentAPIResponse<WithdrawalRequest[]>> {
    try {
      const pending = withdrawalRequests
        .filter(w => w.status === 'pending')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return {
        success: true,
        data: pending
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get pending withdrawals'
      };
    }
  }

  static async approveWithdrawal(withdrawalId: string, adminId: string, note?: string): Promise<PaymentAPIResponse<WithdrawalRequest>> {
    try {
      const withdrawal = withdrawalRequests.find(w => w.id === withdrawalId);
      if (!withdrawal) {
        return {
          success: false,
          error: 'Withdrawal request not found'
        };
      }

      if (withdrawal.status !== 'pending') {
        return {
          success: false,
          error: 'Withdrawal request is not pending'
        };
      }

      // Update withdrawal status
      withdrawal.status = 'approved';
      withdrawal.adminNote = note;
      withdrawal.updatedAt = new Date().toISOString();
      withdrawal.processedAt = new Date().toISOString();

      // Create transaction
      const transaction: Transaction = {
        id: generateTransactionId(),
        userId: withdrawal.userId,
        username: withdrawal.username,
        type: 'withdrawal',
        amount: withdrawal.amount,
        currency: withdrawal.currency,
        status: 'completed',
        paymentMethod: withdrawal.paymentMethod,
        description: `Withdrawal via ${withdrawal.paymentMethod}`,
        metadata: {
          adminId,
          adminNote: note,
          paymentProvider: withdrawal.paymentMethod
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };

      transactions.push(transaction);

      // Update wallet balance
      const balance = walletBalances.find(b => b.userId === withdrawal.userId);
      if (balance) {
        balance.balance -= withdrawal.amount;
        balance.lastUpdated = new Date().toISOString();
      }

      logActivity('WITHDRAWAL_APPROVED', `Admin ${adminId} approved withdrawal ${withdrawalId}`, undefined, adminId);

      return {
        success: true,
        data: withdrawal,
        message: 'Withdrawal approved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to approve withdrawal'
      };
    }
  }

  static async rejectWithdrawal(withdrawalId: string, adminId: string, reason: string): Promise<PaymentAPIResponse<WithdrawalRequest>> {
    try {
      const withdrawal = withdrawalRequests.find(w => w.id === withdrawalId);
      if (!withdrawal) {
        return {
          success: false,
          error: 'Withdrawal request not found'
        };
      }

      if (withdrawal.status !== 'pending') {
        return {
          success: false,
          error: 'Withdrawal request is not pending'
        };
      }

      // Update withdrawal status
      withdrawal.status = 'rejected';
      withdrawal.adminNote = reason;
      withdrawal.updatedAt = new Date().toISOString();

      logActivity('WITHDRAWAL_REJECTED', `Admin ${adminId} rejected withdrawal ${withdrawalId}: ${reason}`, undefined, adminId);

      return {
        success: true,
        data: withdrawal,
        message: 'Withdrawal rejected successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to reject withdrawal'
      };
    }
  }

  static async adjustWalletBalance(userId: string, amount: number, reason: string, adminId: string): Promise<PaymentAPIResponse<WalletBalance>> {
    try {
      let balance = walletBalances.find(b => b.userId === userId);
      
      if (!balance) {
        balance = {
          userId,
          username: 'User', // In real app, get from user service
          balance: 0,
          currency: 'USD',
          lastUpdated: new Date().toISOString(),
          isLocked: false
        };
        walletBalances.push(balance);
      }

      const oldBalance = balance.balance;
      balance.balance += amount;
      balance.lastUpdated = new Date().toISOString();

      // Create adjustment transaction
      const transaction: Transaction = {
        id: generateTransactionId(),
        userId,
        username: balance.username,
        type: 'adjustment',
        amount: Math.abs(amount),
        currency: 'USD',
        status: 'completed',
        description: `Manual adjustment: ${reason}`,
        metadata: {
          adminId,
          adminNote: reason,
          oldBalance,
          newBalance: balance.balance
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      };

      transactions.push(transaction);

      logActivity('WALLET_ADJUSTED', `Admin ${adminId} adjusted wallet for user ${userId}: ${amount > 0 ? '+' : ''}${amount}`, undefined, adminId);

      return {
        success: true,
        data: balance,
        message: 'Wallet balance adjusted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to adjust wallet balance'
      };
    }
  }

  static async getPaymentSettings(): Promise<PaymentAPIResponse<PaymentSettings[]>> {
    try {
      return {
        success: true,
        data: paymentSettings
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get payment settings'
      };
    }
  }

  static async updatePaymentSetting(settingId: string, value: string, adminId: string): Promise<PaymentAPIResponse<PaymentSettings>> {
    try {
      const setting = paymentSettings.find(s => s.id === settingId);
      if (!setting) {
        return {
          success: false,
          error: 'Setting not found'
        };
      }

      setting.value = value;
      setting.updatedAt = new Date().toISOString();

      logActivity('PAYMENT_SETTING_UPDATED', `Admin ${adminId} updated setting ${setting.key}`, undefined, adminId);

      return {
        success: true,
        data: setting,
        message: 'Payment setting updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to update payment setting'
      };
    }
  }

  static async getActivityLogs(limit = 100): Promise<PaymentAPIResponse<ActivityLog[]>> {
    try {
      const logs = activityLogs.slice(0, limit);
      return {
        success: true,
        data: logs
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get activity logs'
      };
    }
  }

  // Internal method to complete deposits (simulated)
  private static async completeDeposit(transactionId: string): Promise<void> {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.status !== 'pending') return;

    transaction.status = 'completed';
    transaction.updatedAt = new Date().toISOString();
    transaction.completedAt = new Date().toISOString();

    // Update wallet balance
    let balance = walletBalances.find(b => b.userId === transaction.userId);
    if (!balance) {
      balance = {
        userId: transaction.userId,
        username: transaction.username,
        balance: 0,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        isLocked: false
      };
      walletBalances.push(balance);
    }

    balance.balance += transaction.amount;
    balance.lastUpdated = new Date().toISOString();

    logActivity('DEPOSIT_COMPLETED', `Deposit ${transactionId} completed for user ${transaction.userId}`, transaction.userId);
  }
} 