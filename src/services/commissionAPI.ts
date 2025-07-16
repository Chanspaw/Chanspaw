// Commission API Service for 1v1 Gaming Platform
// Handles 90% winner / 10% platform split

export interface CommissionConfig {
  houseEdge: number; // Platform commission percentage (10%)
  winnerPercentage: number; // Winner payout percentage (90%)
  minBet: number;
  maxBet: number;
  gameId: string;
  gameName: string;
}

export interface GameResult {
  gameId: string;
  gameName: string;
  player1: string;
  player2: string;
  winner: string;
  betAmount: number;
  winnerPayout: number;
  platformCommission: number;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

export interface Transaction {
  id: string;
  gameResult: GameResult;
  processedAt: Date;
  transactionHash?: string;
}

export interface BonusPromotion {
  id: string;
  name: string;
  type: 'welcome' | 'deposit' | 'loyalty' | 'referral' | 'tournament';
  description: string;
  value: number;
  valueType: 'percentage' | 'fixed';
  minDeposit?: number;
  wageringRequirement?: number;
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  usageCount: number;
  maxUsage?: number;
}

export interface LoyaltyTier {
  id: string;
  name: string;
  level: number;
  minGames: number;
  minSpent: number;
  benefits: string[];
  commissionDiscount: number;
  bonusMultiplier: number;
  icon: string;
  color: string;
}

class CommissionAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL + '/api/commission';
  }

  // Calculate commission for a game result
  calculateCommission(betAmount: number, config: CommissionConfig): {
    winnerPayout: number;
    platformCommission: number;
  } {
    const winnerPayout = (betAmount * config.winnerPercentage) / 100;
    const platformCommission = (betAmount * config.houseEdge) / 100;
    
    return {
      winnerPayout: Math.round(winnerPayout * 100) / 100, // Round to 2 decimal places
      platformCommission: Math.round(platformCommission * 100) / 100
    };
  }

  // Process game result and create transaction
  async processGameResult(gameResult: Omit<GameResult, 'winnerPayout' | 'platformCommission'>): Promise<Transaction> {
    // No dedicated endpoint; handled by payout/game logic
    throw new Error('processGameResult should be handled by the game or payout API, not commissionAPI');
  }

  // Get commission configuration for a specific game
  async getCommissionConfig(gameId: string): Promise<CommissionConfig> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/config/${gameId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch commission config');
    return await response.json();
  }

  // Update commission configuration
  async updateCommissionConfig(gameId: string, config: Partial<CommissionConfig>): Promise<CommissionConfig> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/config/${gameId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    if (!response.ok) throw new Error('Failed to update commission config');
    return await response.json();
  }

  // Get transaction history (use /api/payments/transactions)
  async getTransactionHistory(filters?: {
    gameId?: string;
    playerId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<Transaction[]> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const params = new URLSearchParams();
    if (filters?.gameId) params.append('gameId', filters.gameId);
    if (filters?.playerId) params.append('playerId', filters.playerId);
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
    if (filters?.status) params.append('status', filters.status);
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/transactions?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch transaction history');
    const data = await response.json();
    return data.data?.transactions || [];
  }

  // Get financial statistics (use /api/payments/stats)
  async getFinancialStats(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<any> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/stats?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch financial stats');
    return await response.json();
  }

  // Bonus and promotion management (not implemented)
  async getBonusPromotions(): Promise<BonusPromotion[]> {
    throw new Error('Bonus promotions API not implemented');
  }

  // Loyalty program management (not implemented)
  async getLoyaltyTiers(): Promise<LoyaltyTier[]> {
    throw new Error('Loyalty tiers API not implemented');
  }

  // Validate bet amount against commission config
  validateBetAmount(betAmount: number, config: CommissionConfig): {
    isValid: boolean;
    error?: string;
  } {
    if (betAmount < config.minBet) {
      return {
        isValid: false,
        error: `Minimum bet is $${config.minBet}`
      };
    }
    
    if (betAmount > config.maxBet) {
      return {
        isValid: false,
        error: `Maximum bet is $${config.maxBet}`
      };
    }
    
    return { isValid: true };
  }

  // Calculate loyalty discount for a player
  calculateLoyaltyDiscount(playerTier: LoyaltyTier, baseCommission: number): number {
    return (baseCommission * playerTier.commissionDiscount) / 100;
  }

  // Apply loyalty benefits to a transaction
  applyLoyaltyBenefits(
    transaction: Transaction,
    playerTier: LoyaltyTier
  ): {
    adjustedWinnerPayout: number;
    adjustedPlatformCommission: number;
    loyaltyBonus: number;
  } {
    const loyaltyBonus = (transaction.gameResult.winnerPayout * (playerTier.bonusMultiplier - 1));
    const commissionDiscount = this.calculateLoyaltyDiscount(playerTier, transaction.gameResult.platformCommission);
    
    return {
      adjustedWinnerPayout: transaction.gameResult.winnerPayout + loyaltyBonus,
      adjustedPlatformCommission: transaction.gameResult.platformCommission - commissionDiscount,
      loyaltyBonus
    };
  }
}

export const commissionAPI = new CommissionAPI(); 