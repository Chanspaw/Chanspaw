# Chanspaw Payment System Integration Guide

## Overview

The Chanspaw platform now includes a comprehensive payment system that handles deposits, withdrawals, transaction management, and admin controls. This system is designed with security and scalability in mind, providing both user-facing and admin functionality.

## 🏗️ Architecture

### Core Components

1. **Payment API Service** (`src/services/paymentAPI.ts`)
   - Centralized payment operations
   - Mock data storage (replaceable with real backend)
   - Transaction processing and validation
   - Activity logging

2. **Type Definitions** (`src/types/payment.ts`)
   - Comprehensive TypeScript interfaces
   - Transaction, wallet, and payment method types
   - Admin management types

3. **User Components**
   - `WalletDashboard.tsx` - User wallet interface
   - Real-time balance updates
   - Transaction history
   - Deposit/withdrawal functionality

4. **Admin Components**
   - `PaymentManagement.tsx` - Admin payment control panel
   - Transaction monitoring
   - Withdrawal approval system
   - Wallet adjustments
   - Payment settings management

## 🔐 Security Features

### User Funds Protection
- **Transaction Validation**: All amounts validated before processing
- **Balance Checks**: Insufficient funds prevention
- **Activity Logging**: Complete audit trail of all financial operations
- **Admin Oversight**: Manual approval required for withdrawals
- **Account Locking**: Ability to lock user accounts for security

### Admin Security
- **Role-Based Access**: Admin-only payment management
- **Audit Trails**: Complete logging of admin actions
- **Secure Settings**: Encrypted storage of API keys
- **Transaction Monitoring**: Real-time oversight of all financial activity

## 💰 User-Side Features

### Wallet Dashboard
- **Real-time Balance**: Live wallet balance display
- **Transaction History**: Complete transaction log with status indicators
- **Deposit System**: Multiple payment method support
- **Withdrawal Requests**: Secure withdrawal processing
- **Quick Actions**: Fast deposit amounts and payment methods

### Payment Methods Supported
- Credit/Debit Cards (Stripe)
- PayPal
- Bank Transfers
- Cryptocurrency (configurable)

### Transaction Types
- `deposit` - User deposits funds
- `withdrawal` - User withdrawal requests
- `adjustment` - Admin manual balance adjustments
- `game_win` - Game winnings
- `game_loss` - Game losses

### Transaction Statuses
- `pending` - Awaiting processing
- `completed` - Successfully processed
- `failed` - Processing failed
- `cancelled` - User cancelled
- `rejected` - Admin rejected

## 👨‍💼 Admin-Side Features

### Payment Management Dashboard
- **Overview Tab**: Key metrics and quick actions
- **Transactions Tab**: Complete transaction monitoring
- **Withdrawals Tab**: Pending withdrawal management
- **Settings Tab**: Payment API configuration
- **Activity Logs Tab**: System activity monitoring

### Key Metrics
- Total deposits and withdrawals
- Pending withdrawal amounts
- User count and average balances
- Revenue tracking and growth rates

### Admin Actions
- **Withdrawal Approval/Rejection**: Manual review of withdrawal requests
- **Wallet Adjustments**: Manual balance modifications
- **Payment Settings**: API key management
- **Transaction Monitoring**: Real-time oversight
- **Activity Logging**: Complete audit trail

## 🔧 API Integration

### Payment API Methods

#### User Methods
```typescript
// Get user wallet balance
PaymentAPI.getWalletBalance(userId: string)

// Get transaction history
PaymentAPI.getTransactionHistory(userId: string, limit?: number)

// Create deposit
PaymentAPI.createDeposit(userId: string, amount: number, paymentMethod: string)

// Create withdrawal request
PaymentAPI.createWithdrawal(userId: string, amount: number, paymentMethod: string, accountDetails: any)
```

#### Admin Methods
```typescript
// Get payment statistics
PaymentAPI.getPaymentStats()

// Get all transactions
PaymentAPI.getAllTransactions(limit?: number)

// Get pending withdrawals
PaymentAPI.getPendingWithdrawals()

// Approve withdrawal
PaymentAPI.approveWithdrawal(withdrawalId: string, adminId: string, note?: string)

// Reject withdrawal
PaymentAPI.rejectWithdrawal(withdrawalId: string, adminId: string, reason: string)

// Adjust wallet balance
PaymentAPI.adjustWalletBalance(userId: string, amount: number, reason: string, adminId: string)

// Manage payment settings
PaymentAPI.getPaymentSettings()
PaymentAPI.updatePaymentSetting(settingId: string, value: string, adminId: string)

// Activity logs
PaymentAPI.getActivityLogs(limit?: number)
```

## 🚀 Implementation Steps

### 1. Frontend Integration
The payment system is already integrated into the Chanspaw frontend:

- **User Wallet**: Accessible via the main sidebar "Wallet" section
- **Admin Panel**: Accessible via "Wallet & Payments" in admin sidebar
- **Real-time Updates**: Automatic balance refresh after transactions

### 2. Backend Integration (Future)
To replace the mock API with real backend:

1. **Database Setup**
   ```sql
   -- Users table
   CREATE TABLE users (
     id VARCHAR(255) PRIMARY KEY,
     username VARCHAR(255) NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Wallet balances table
   CREATE TABLE wallet_balances (
     user_id VARCHAR(255) PRIMARY KEY,
     balance DECIMAL(10,2) DEFAULT 0.00,
     currency VARCHAR(3) DEFAULT 'USD',
     is_locked BOOLEAN DEFAULT FALSE,
     lock_reason TEXT,
     last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id)
   );

   -- Transactions table
   CREATE TABLE transactions (
     id VARCHAR(255) PRIMARY KEY,
     user_id VARCHAR(255) NOT NULL,
     type ENUM('deposit', 'withdrawal', 'adjustment', 'game_win', 'game_loss'),
     amount DECIMAL(10,2) NOT NULL,
     currency VARCHAR(3) DEFAULT 'USD',
     status ENUM('pending', 'completed', 'failed', 'cancelled', 'rejected'),
     payment_method VARCHAR(255),
     description TEXT,
     metadata JSON,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     completed_at TIMESTAMP NULL,
     FOREIGN KEY (user_id) REFERENCES users(id)
   );

   -- Withdrawal requests table
   CREATE TABLE withdrawal_requests (
     id VARCHAR(255) PRIMARY KEY,
     user_id VARCHAR(255) NOT NULL,
     amount DECIMAL(10,2) NOT NULL,
     currency VARCHAR(3) DEFAULT 'USD',
     payment_method VARCHAR(255) NOT NULL,
     account_details JSON,
     status ENUM('pending', 'approved', 'rejected', 'completed'),
     admin_note TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     processed_at TIMESTAMP NULL,
     FOREIGN KEY (user_id) REFERENCES users(id)
   );

   -- Activity logs table
   CREATE TABLE activity_logs (
     id VARCHAR(255) PRIMARY KEY,
     user_id VARCHAR(255) NULL,
     admin_id VARCHAR(255) NULL,
     action VARCHAR(255) NOT NULL,
     details TEXT,
     ip_address VARCHAR(45),
     user_agent TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Payment Provider Integration**
   - Stripe for credit/debit cards
   - PayPal for digital payments
   - Bank transfer processing
   - Cryptocurrency gateways

3. **Webhook Handlers**
   - Payment confirmation webhooks
   - Failed payment notifications
   - Refund processing

### 3. Security Implementation
- **API Key Management**: Secure storage of payment provider keys
- **Webhook Verification**: Validate webhook signatures
- **Rate Limiting**: Prevent abuse of payment endpoints
- **Input Validation**: Sanitize all user inputs
- **SQL Injection Prevention**: Use parameterized queries

## 📊 Monitoring & Analytics

### Key Metrics to Track
- **Transaction Volume**: Daily/weekly/monthly transaction counts
- **Success Rates**: Payment success vs failure rates
- **Average Transaction Value**: Mean deposit/withdrawal amounts
- **User Engagement**: Active wallet users
- **Revenue Growth**: Platform revenue trends

### Alert System
- **Failed Transactions**: Immediate alerts for failed payments
- **High-Value Transactions**: Notifications for large amounts
- **Suspicious Activity**: Unusual transaction patterns
- **System Errors**: Payment processing failures

## 🔄 Testing

### User Testing
1. **Deposit Flow**: Test deposit with various payment methods
2. **Withdrawal Flow**: Test withdrawal request and approval
3. **Balance Updates**: Verify real-time balance updates
4. **Transaction History**: Check transaction logging accuracy

### Admin Testing
1. **Withdrawal Approval**: Test approval/rejection workflows
2. **Wallet Adjustments**: Test manual balance modifications
3. **Settings Management**: Test payment API configuration
4. **Activity Logging**: Verify audit trail completeness

### Security Testing
1. **Input Validation**: Test with malicious inputs
2. **Authorization**: Verify admin-only access
3. **Data Integrity**: Check transaction consistency
4. **Error Handling**: Test system resilience

## 🚨 Important Notes

### Compliance
- **KYC/AML**: Implement user verification for large transactions
- **Tax Reporting**: Track and report gambling winnings
- **Data Protection**: Comply with GDPR and privacy regulations
- **Financial Regulations**: Follow local gambling and financial laws

### Best Practices
- **Regular Backups**: Backup transaction data frequently
- **Monitoring**: Set up comprehensive system monitoring
- **Documentation**: Maintain detailed API documentation
- **Testing**: Regular security and functionality testing
- **Updates**: Keep payment providers and security measures updated

## 🔧 Configuration

### Environment Variables
```bash
# Payment Provider Keys
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=paypal_client_id_...
PAYPAL_SECRET=paypal_secret_...

# Security
JWT_SECRET=your_jwt_secret
WEBHOOK_SECRET=your_webhook_secret

# Database
DATABASE_URL=your_database_url

# App Configuration
NODE_ENV=production
PORT=3000
```

### Payment Settings
Configure payment methods in the admin panel:
- Enable/disable payment methods
- Set minimum/maximum amounts
- Configure currencies
- Set processing fees

## 📞 Support

For technical support or questions about the payment system:
- Check the activity logs for error details
- Review transaction status in the admin panel
- Monitor system health metrics
- Contact the development team for complex issues

---

**Note**: This payment system is currently using mock data for demonstration purposes. For production use, integrate with real payment providers and implement proper security measures. 