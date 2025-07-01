# Chanspaw Authentication System Guide

## Overview

This document outlines the comprehensive authentication system implemented for the Chanspaw gaming platform, including JWT-based authentication, email verification, two-factor authentication (2FA), and KYC/AML compliance.

## System Architecture

### Core Components

1. **AuthAPI Service** (`src/services/authAPI.ts`)
   - JWT token management
   - User authentication and registration
   - Email verification
   - Two-factor authentication
   - KYC/AML processing
   - Session management

2. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - Global authentication state management
   - User session handling
   - Token refresh logic
   - Admin functionality

3. **Authentication Components**
   - `AuthPage.tsx` - Main authentication page
   - `LoginForm.tsx` - Login with 2FA support
   - `RegisterForm.tsx` - Registration with email verification

4. **Admin Panel**
   - `KYCManagement.tsx` - KYC verification management
   - `UserManagement.tsx` - User administration
   - `SecurityControl.tsx` - Security settings

## Authentication Flow

### 1. User Registration

```typescript
// Registration process
const result = await register(username, email, password, firstName, lastName, phoneNumber);

// Email verification required
if (result.success) {
  // Send verification email
  await sendEmailVerification(email);
}
```

**Features:**
- Email validation
- Password strength requirements (8+ characters)
- Email verification required before login
- Optional phone number and personal information

### 2. User Login

```typescript
// Login with optional 2FA
const result = await login(email, password, twoFactorCode);

if (result.requiresTwoFactor) {
  // Show 2FA input
} else if (result.requiresKYC) {
  // Prompt for KYC verification
}
```

**Features:**
- Account lockout after 5 failed attempts (15-minute lockout)
- Email verification required
- Two-factor authentication support
- KYC verification prompts for large transactions

### 3. Two-Factor Authentication

```typescript
// Setup 2FA
const setup = await setupTwoFactor(userId);
// Returns QR code and backup codes

// Enable 2FA
await enableTwoFactor(userId, verificationCode);

// Disable 2FA
await disableTwoFactor(userId, verificationCode);
```

**Features:**
- TOTP (Time-based One-Time Password) support
- QR code generation for authenticator apps
- Backup codes for account recovery
- Optional for regular users, required for admins

## Security Features

### JWT Token Management

```typescript
class TokenManager {
  static setTokens(accessToken: string, refreshToken: string);
  static getAccessToken(): string | null;
  static getRefreshToken(): string | null;
  static clearTokens();
  static isTokenExpired(token: string): boolean;
}
```

**Security Measures:**
- Access tokens expire in 24 hours
- Refresh tokens for seamless re-authentication
- Automatic token refresh on 401 responses
- Secure token storage in localStorage

### Account Security

- **Password Policy**: Minimum 8 characters
- **Account Lockout**: 5 failed attempts → 15-minute lockout
- **Session Management**: Track device information and IP addresses
- **Email Verification**: Required for all accounts
- **Two-Factor Authentication**: Optional for users, required for admins

## KYC/AML Compliance

### KYC Levels

1. **Level 1 (Identity)**: Basic identity verification
2. **Level 2 (Address)**: Address verification
3. **Level 3 (Income/Source of Funds)**: Enhanced due diligence

### KYC Process

```typescript
// Submit KYC verification
const kycData = {
  type: 'identity' | 'address' | 'income' | 'source_of_funds',
  documents: File[],
  personalInfo: {
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    nationality: string,
    address: Address
  }
};

await submitKYC(userId, kycData);
```

### Admin KYC Management

```typescript
// Approve KYC
await approveKYC(kycId, adminId);

// Reject KYC with reason
await rejectKYC(kycId, adminId, rejectionReason);

// Get KYC status
const status = await getKYCStatus(userId);
```

**Features:**
- Document upload and verification
- Admin review and approval process
- Rejection with detailed reasons
- KYC status tracking
- Expiration management

## Admin Panel Features

### User Management

- View all users with filtering and search
- Update user information
- Manage user status (active/banned)
- View user activity and statistics

### KYC Management

- Review pending KYC submissions
- Approve or reject KYC with reasons
- View document uploads
- Track KYC status and expiration

### Security Controls

- Monitor login attempts and suspicious activity
- Manage admin permissions
- View security logs
- Configure security policies

## API Endpoints

### Authentication Endpoints

```
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/verify-email
POST /auth/send-verification
POST /auth/setup-2fa
POST /auth/enable-2fa
POST /auth/disable-2fa
```

### KYC Endpoints

```
POST /auth/submit-kyc
GET /auth/kyc-status
POST /auth/approve-kyc
POST /auth/reject-kyc
```

### Admin Endpoints

```
GET /auth/users
GET /auth/user?id={userId}
PUT /auth/user
```

## Database Schema

### User Table

```typescript
interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  balance: number;
  wins: number;
  losses: number;
  level: number;
  isAdmin: boolean;
  createdAt: string;
  
  // Authentication & Security
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastLogin?: string;
  loginAttempts: number;
  accountLocked: boolean;
  lockoutUntil?: string;
  
  // KYC/AML
  kycStatus: 'pending' | 'verified' | 'rejected' | 'not_required';
  kycLevel: 1 | 2 | 3;
  amlStatus: 'pending' | 'cleared' | 'flagged' | 'not_required';
  identityVerified: boolean;
  
  // Personal Information
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: Address;
  phoneNumber?: string;
}
```

### KYC Verification Table

```typescript
interface KYCVerification {
  id: string;
  userId: string;
  type: 'identity' | 'address' | 'income' | 'source_of_funds';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  documents: KYCDocument[];
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  expiryDate?: string;
}
```

## Production Considerations

### Security Enhancements

1. **HTTPS Only**: All API calls must use HTTPS
2. **Rate Limiting**: Implement rate limiting on authentication endpoints
3. **Input Validation**: Server-side validation of all inputs
4. **SQL Injection Prevention**: Use parameterized queries
5. **XSS Protection**: Sanitize all user inputs
6. **CSRF Protection**: Implement CSRF tokens

### Email Service Integration

```typescript
// Production email service (e.g., SendGrid, AWS SES)
const emailService = {
  sendVerificationEmail: async (email: string, token: string) => {
    // Integrate with email service provider
  },
  sendPasswordResetEmail: async (email: string, token: string) => {
    // Password reset functionality
  },
  sendTwoFactorEmail: async (email: string, code: string) => {
    // Email-based 2FA
  }
};
```

### Payment Provider Integration

```typescript
// KYC verification with payment providers
const paymentProvider = {
  verifyIdentity: async (userData: User, documents: File[]) => {
    // Integrate with Stripe, PayPal, or other providers
  },
  performAMLCheck: async (userData: User, transactionData: any) => {
    // AML compliance checks
  }
};
```

### Monitoring and Logging

```typescript
// Security event logging
const securityLogger = {
  logLoginAttempt: (userId: string, success: boolean, ip: string) => {
    // Log to security monitoring system
  },
  logKYCActivity: (userId: string, action: string, details: any) => {
    // Log KYC activities for compliance
  },
  logAdminAction: (adminId: string, action: string, targetId: string) => {
    // Log admin actions for audit trail
  }
};
```

## Testing

### Unit Tests

```typescript
// Test authentication flows
describe('Authentication', () => {
  test('User registration with email verification', async () => {
    // Test registration flow
  });
  
  test('Login with 2FA', async () => {
    // Test 2FA login flow
  });
  
  test('KYC submission and approval', async () => {
    // Test KYC workflow
  });
});
```

### Integration Tests

```typescript
// Test API endpoints
describe('Auth API', () => {
  test('POST /auth/register', async () => {
    // Test registration endpoint
  });
  
  test('POST /auth/login', async () => {
    // Test login endpoint
  });
});
```

## Deployment Checklist

- [ ] Configure HTTPS certificates
- [ ] Set up email service integration
- [ ] Configure database with proper indexes
- [ ] Set up monitoring and alerting
- [ ] Configure backup and recovery
- [ ] Set up rate limiting
- [ ] Configure security headers
- [ ] Set up logging and audit trails
- [ ] Test all authentication flows
- [ ] Verify KYC/AML compliance
- [ ] Set up admin access controls

## Compliance Requirements

### GDPR Compliance

- User data portability
- Right to be forgotten
- Data retention policies
- Privacy policy updates

### AML/KYC Compliance

- Customer identification procedures
- Transaction monitoring
- Suspicious activity reporting
- Record keeping requirements

### Gaming License Requirements

- Age verification
- Responsible gaming measures
- Transaction limits
- Self-exclusion options

## Support and Maintenance

### Regular Tasks

1. **Security Audits**: Monthly security reviews
2. **Token Rotation**: Regular JWT secret rotation
3. **Backup Verification**: Test backup and recovery procedures
4. **Compliance Reviews**: Quarterly compliance assessments
5. **Performance Monitoring**: Monitor authentication performance

### Incident Response

1. **Security Breach**: Immediate token invalidation and user notification
2. **System Outage**: Fallback authentication methods
3. **Compliance Violation**: Immediate reporting and remediation

This authentication system provides a robust, secure, and compliant foundation for the Chanspaw gaming platform, ensuring user safety and regulatory compliance while maintaining a smooth user experience. 