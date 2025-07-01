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
    // Use fallback URL for browser environment
    this.baseURL = import.meta.env.VITE_API_URL + '/api';
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
    try {
      // Get commission config for the game
      const config = await this.getCommissionConfig(gameResult.gameId);
      
      // Calculate payouts
      const { winnerPayout, platformCommission } = this.calculateCommission(gameResult.betAmount, config);
      
      // Create complete game result
      const completeResult: GameResult = {
        ...gameResult,
        winnerPayout,
        platformCommission
      };

      // TODO: Replace with actual API call
      // const response = await fetch(`${this.baseURL}/commission/process-game`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(completeResult)
      // });
      
      // Mock response for demonstration
      const transaction: Transaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        gameResult: completeResult,
        processedAt: new Date(),
        transactionHash: `hash-${Math.random().toString(36).substr(2, 16)}`
      };

      return transaction;
    } catch (error) {
      console.error('Error processing game result:', error);
      throw new Error('Failed to process game result');
    }
  }

  // Get commission configuration for a specific game
  async getCommissionConfig(gameId: string): Promise<CommissionConfig> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`${this.baseURL}/commission/config/${gameId}`);
      if (response.ok) {
        return await response.json();
      }
      
      // Return default config if API call fails
      return {
        gameId,
        gameName: 'Unknown Game',
        houseEdge: 10,
        winnerPercentage: 90,
        minBet: 1,
        maxBet: 100
      };
    } catch (error) {
      console.error('Error fetching commission config:', error);
      // Return default config on error
      return {
        gameId,
        gameName: 'Unknown Game',
        houseEdge: 10,
        winnerPercentage: 90,
        minBet: 1,
        maxBet: 100
      };
    }
  }

  // Update commission configuration
  async updateCommissionConfig(gameId: string, config: Partial<CommissionConfig>): Promise<CommissionConfig> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`${this.baseURL}/commission/config/${gameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        return await response.json();
      }
      
      // Return current config if update fails
      return await this.getCommissionConfig(gameId);
    } catch (error) {
      console.error('Error updating commission config:', error);
      // Return current config on error
      return await this.getCommissionConfig(gameId);
    }
  }

  // Get transaction history
  async getTransactionHistory(filters?: {
    gameId?: string;
    playerId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<Transaction[]> {
    try {
      // TODO: Replace with actual API call
      const queryParams = new URLSearchParams();
      if (filters?.gameId) queryParams.append('gameId', filters.gameId);
      if (filters?.playerId) queryParams.append('playerId', filters.playerId);
      if (filters?.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters?.endDate) queryParams.append('endDate', filters.endDate.toISOString());
      if (filters?.status) queryParams.append('status', filters.status);
      
      const response = await fetch(`${this.baseURL}/commission/transactions?${queryParams}`);
      if (response.ok) {
        return await response.json();
      }
      
      // Return empty array if API call fails
      return [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      // Return empty array on error
      return [];
    }
  }

  // Get financial statistics
  async getFinancialStats(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<{
    totalRevenue: number;
    totalCommission: number;
    totalGames: number;
    averageBet: number;
    topGames: Array<{ gameName: string; revenue: number; games: number }>;
  }> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`${this.baseURL}/commission/stats?period=${period}`);
      if (response.ok) {
        return await response.json();
      }
      
      // Return empty data if API call fails
      return {
        totalRevenue: 0,
        totalCommission: 0,
        totalGames: 0,
        averageBet: 0,
        topGames: []
      };
    } catch (error) {
      console.error('Error fetching financial stats:', error);
      // Return empty data on error
      return {
        totalRevenue: 0,
        totalCommission: 0,
        totalGames: 0,
        averageBet: 0,
        topGames: []
      };
    }
  }

  // Bonus and promotion management
  async getBonusPromotions(): Promise<BonusPromotion[]> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`${this.baseURL}/commission/bonuses`);
      if (response.ok) {
        return await response.json();
      }
      
      // Return empty array if API call fails
      return [];
    } catch (error) {
      console.error('Error fetching bonus promotions:', error);
      // Return empty array on error
      return [];
    }
  }

  // Loyalty program management
  async getLoyaltyTiers(): Promise<LoyaltyTier[]> {
    try {
      // TODO: Replace with actual API call
      const response = await fetch(`${this.baseURL}/commission/loyalty`);
      if (response.ok) {
        return await response.json();
      }
      
      // Return empty array if API call fails
      return [];
    } catch (error) {
      console.error('Error fetching loyalty tiers:', error);
      // Return empty array on error
      return [];
    }
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