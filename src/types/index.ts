import { LucideIcon } from 'lucide-react';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  balance: number;
  real_balance: number;
  virtual_balance: number;
  wins: number;
  losses: number;
  level: number;
  isAdmin: boolean;
  createdAt: string;
  bio?: string;
  joinDate?: string;
  winStreak?: number;
  currentStreak?: number;
  bestStreak?: number;
  gamesToday?: number;
  averageScore?: number;
  totalPlayTime?: number;
  diamondHuntWins?: number;
  connectFourWins?: number;
  diceBattleWins?: number;
  tictactoeWins?: number;
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
  // Personal Information for KYC
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: Address;
  phoneNumber?: string;
  // Security
  passwordChangedAt?: string;
  securityQuestions?: SecurityQuestion[];
  ipWhitelist?: string[];
  deviceTrusted?: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answer: string; // Hashed
}

export interface Friend {
  id: string;
  username: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'playing';
  lastSeen?: string;
}

export interface FriendRequest {
  id: string;
  from: {
    id: string;
    username: string;
    email: string;
    avatar: string;
  };
  message?: string;
  timestamp: string;
}

export interface GameRule {
  id: string;
  name: string;
  value: string | number | boolean;
  type: 'number' | 'text' | 'boolean' | 'select';
  options?: string[];
  description: string;
}

export interface Game {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgGradient: string;
  minBet: number;
  maxBet: number;
  players: string;
  duration: string;
  difficulty: string;
  gameId: string;
  features: string[];
  rewards: string;
  isActive: boolean;
  rules?: GameRule[];
}

export interface Match {
  id: string;
  gameId: string;
  player1: User;
  player2: User | null;
  status: 'waiting' | 'playing' | 'finished';
  bet: number;
  winner: string | null;
  startedAt: string;
  finishedAt?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'bet' | 'win';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface GameState {
  id: string;
  matchId: string;
  currentPlayer: string;
  board: any[];
  moves: any[];
  gameData: any;
}

// Admin Security & Control Types
export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: string;
  createdBy: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: 'users' | 'games' | 'wallet' | 'analytics' | 'content' | 'notifications' | 'settings' | 'security' | 'backup';
  action: 'read' | 'write' | 'delete' | 'admin';
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  roleId: string;
  role: AdminRole;
  isActive: boolean;
  lastLogin?: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  createdBy: string;
}

export interface ActivityLog {
  id: string;
  adminId: string;
  adminUsername: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  status: 'success' | 'failed' | 'warning';
}

export interface BackupData {
  id: string;
  name: string;
  description: string;
  type: 'full' | 'users' | 'games' | 'settings' | 'logs';
  size: number;
  createdAt: string;
  createdBy: string;
  status: 'completed' | 'in_progress' | 'failed';
  downloadUrl?: string;
}

export interface TwoFactorAuth {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  isEnabled: boolean;
  lastUsed?: string;
  recoveryEmail?: string;
}

export interface SecuritySettings {
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  requireTwoFactor: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  ipWhitelist: string[];
  allowedDomains: string[];
}

export interface LoginSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo: DeviceInfo;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  lastActivity: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  os: string;
  isTrusted: boolean;
  location?: string;
}

export interface KYCVerification {
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

export interface KYCDocument {
  id: string;
  type: 'passport' | 'national_id' | 'drivers_license' | 'utility_bill' | 'bank_statement' | 'selfie';
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  verifiedAt?: string;
  verificationScore?: number;
  isExpired: boolean;
}

export interface AMLCheck {
  id: string;
  userId: string;
  type: 'transaction' | 'user' | 'periodic';
  status: 'pending' | 'cleared' | 'flagged' | 'blocked';
  riskScore: number;
  flags: AMLFlag[];
  checkedAt: string;
  expiresAt: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface AMLFlag {
  id: string;
  type: 'high_risk_country' | 'sanctioned_entity' | 'unusual_pattern' | 'large_amount' | 'multiple_accounts';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
}

export interface EmailVerification {
  id: string;
  userId: string;
  email: string;
  token: string;
  type: 'registration' | 'password_reset' | 'email_change' | 'two_factor_recovery' | 'email_verification';
  expiresAt: string;
  used: boolean;
  usedAt?: string;
  createdAt?: string;
}

export interface PhoneVerification {
  id: string;
  userId: string;
  phoneNumber: string;
  code: string;
  type: 'registration' | 'password_reset' | 'two_factor';
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  verifiedAt?: string;
}