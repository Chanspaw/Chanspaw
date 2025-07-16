// Game API
// Real Gaming System - Chanspaw Platform
// Server-side logic for 1v1 games with betting

// Types for the gaming system
interface GameMatch {
  id: string;
  gameType: 'connect_four' | 'tic_tac_toe' | 'dice_battle' | 'diamond_hunt';
  player1: {
    userId: string;
    username: string;
    betAmount: number;
    ready: boolean;
    joinedAt: Date;
  };
  player2?: {
    userId: string;
    username: string;
    betAmount: number;
    ready: boolean;
    joinedAt: Date;
  };
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  totalPot: number;
  platformFee: number;
  winnerAmount: number;
  gameData: any;
  winner?: string;
  loser?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  matchType: 'real' | 'virtual';
}

interface GameConfig {
  id: string;
  name: string;
  type: string;
  minBet: number;
  maxBet: number;
  platformFeePercent: number;
  isActive: boolean;
  maxWaitTime: number;
  autoCancelTime: number;
}

interface MatchmakingQueue {
  userId: string;
  username: string;
  gameType: string;
  betAmount: number;
  joinedAt: Date;
  matchType: 'real' | 'virtual';
  preferences?: {
    maxWaitTime?: number;
    skillLevel?: 'beginner' | 'intermediate' | 'expert';
  };
}

// Real Game API
export class GameAPI {
  private static baseURL = import.meta.env.VITE_API_URL + '/api/games';

  // Remove all in-memory storage and configs

  // Join matchmaking queue
  static async joinMatchmaking(userId: string, username: string, gameType: string, betAmount: number, matchType: 'real' | 'virtual' = 'real', preferences?: any): Promise<{ success: boolean; matchId?: string; error?: string }> {
    try {
      const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
      const response = await fetch(`${this.baseURL}/matchmaking/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, username, gameType, betAmount, matchType, preferences })
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Failed to join matchmaking' };
      return { success: true, matchId: data.data?.matchId };
    } catch (error) {
      return { success: false, error: 'Failed to join matchmaking' };
    }
  }

  static async getMatchmakingStatus(userId: string): Promise<{ success: boolean; inQueue?: boolean; matchId?: string; error?: string }> {
    try {
      const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
      const response = await fetch(`${this.baseURL}/matchmaking/status?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Failed to get matchmaking status' };
      return { success: true, inQueue: data.data?.inQueue, matchId: data.data?.matchId };
    } catch (error) {
      return { success: false, error: 'Failed to get matchmaking status' };
    }
  }

  static async leaveMatchmaking(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
      const response = await fetch(`${this.baseURL}/matchmaking/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Failed to leave matchmaking' };
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to leave matchmaking' };
    }
  }

  static async getMatch(matchId: string): Promise<{ success: boolean; match?: any; error?: string }> {
    try {
      const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
      const response = await fetch(`${this.baseURL}/match/${matchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Failed to get match' };
      return { success: true, match: data.data?.match };
    } catch (error) {
      return { success: false, error: 'Failed to get match' };
    }
  }

  static async makeMove(matchId: string, userId: string, move: any): Promise<{ success: boolean; gameData?: any; isGameOver?: boolean; winner?: string; error?: string }> {
    try {
      const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
      const response = await fetch(`${this.baseURL}/match/${matchId}/move`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, move })
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Failed to make move' };
      return { success: true, gameData: data.data?.gameData, isGameOver: data.data?.isGameOver, winner: data.data?.winner };
    } catch (error) {
      return { success: false, error: 'Failed to make move' };
    }
  }

  static async getGameStats(params: { timeRange?: string; matchType?: string } = {}): Promise<{ success: boolean; stats?: any; error?: string }> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const searchParams = new URLSearchParams();
    if (params.timeRange) searchParams.append('timeRange', params.timeRange);
    if (params.matchType) searchParams.append('matchType', params.matchType);
    const response = await fetch(`${this.baseURL}/stats?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Failed to fetch game stats' };
    return { success: true, stats: data.data };
  }

  static async getGameHistory(params: { page?: number; limit?: number; gameType?: string; result?: string; matchType?: string } = {}): Promise<{ success: boolean; matches?: any[]; error?: string }> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.gameType) searchParams.append('gameType', params.gameType);
    if (params.result) searchParams.append('result', params.result);
    if (params.matchType) searchParams.append('matchType', params.matchType);
    const response = await fetch(`${this.baseURL}/history?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Failed to fetch game history' };
    return { success: true, matches: data.data?.gameResults };
  }

  static async getGameConfigs(): Promise<{ success: boolean; configs?: any[]; error?: string }> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/configs`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Failed to get game configs' };
    return { success: true, configs: data.data?.configs };
  }

  static async getAdminStats(): Promise<{ success: boolean; stats?: any; error?: string }> {
    const token = localStorage.getItem('chanspaw_access_token') || localStorage.getItem('token');
    const response = await fetch(`${this.baseURL}/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Failed to get admin stats' };
    return { success: true, stats: data.data };
  }
} 