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
  private static baseURL = 'https://api.chanspaw.com/games';

  // In-memory storage for development
  private static activeMatches: Map<string, GameMatch> = new Map();
  private static matchmakingQueue: MatchmakingQueue[] = [];
  private static gameConfigs: Map<string, GameConfig> = new Map();

  // Game configurations
  private static initializeGameConfigs() {
    const configs: GameConfig[] = [
      {
        id: 'connect_four',
        name: 'Connect Four',
        type: 'connect_four',
        minBet: 1,
        maxBet: 100,
        platformFeePercent: 10,
        isActive: true,
        maxWaitTime: 300,
        autoCancelTime: 600
      },
      {
        id: 'tic_tac_toe',
        name: 'Tic Tac Toe 5x5',
        type: 'tic_tac_toe',
        minBet: 1,
        maxBet: 50,
        platformFeePercent: 10,
        isActive: true,
        maxWaitTime: 300,
        autoCancelTime: 600
      },
      {
        id: 'dice_battle',
        name: 'Dice Battle',
        type: 'dice_battle',
        minBet: 1,
        maxBet: 200,
        platformFeePercent: 10,
        isActive: true,
        maxWaitTime: 300,
        autoCancelTime: 600
      },
      {
        id: 'diamond_hunt',
        name: 'Diamond Hunt',
        type: 'diamond_hunt',
        minBet: 1,
        maxBet: 500,
        platformFeePercent: 10,
        isActive: true,
        maxWaitTime: 300,
        autoCancelTime: 600
      }
    ];

    configs.forEach(config => {
      this.gameConfigs.set(config.id, config);
    });
  }

  // Initialization
  static initialize() {
    this.initializeGameConfigs();
    this.startMatchmakingLoop();
    this.startAutoCancelLoop();
    console.log('Game API initialized with real 1v1 betting system');
  }

  // Join matchmaking queue
  static async joinMatchmaking(userId: string, username: string, gameType: string, betAmount: number, matchType: 'real' | 'virtual' = 'real', preferences?: any): Promise<{ success: boolean; matchId?: string; error?: string }> {
    try {
      const config = this.gameConfigs.get(gameType);
      if (!config || !config.isActive) {
        return { success: false, error: 'Game type not available' };
      }

      if (betAmount < config.minBet || betAmount > config.maxBet) {
        return { success: false, error: `Bet amount must be between $${config.minBet} and $${config.maxBet}` };
      }

      // Check if user already has an active match
      const existingMatch = Array.from(this.activeMatches.values()).find(
        match => (match.player1.userId === userId || match.player2?.userId === userId) && match.status === 'active'
      );

      if (existingMatch) {
        return { success: false, error: 'You already have an active match' };
      }

      // Look for opponent in queue with same match type
      const opponent = this.matchmakingQueue.find(
        player => player.userId !== userId && 
                  player.gameType === gameType && 
                  player.betAmount === betAmount &&
                  player.matchType === matchType &&
                  !this.isPlayerInActiveMatch(player.userId)
      );

      if (opponent) {
        // Create a match
        const matchId = `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const totalPot = betAmount * 2;
        const platformFee = matchType === 'real' ? totalPot * (config.platformFeePercent / 100) : 0;
        const winnerAmount = totalPot - platformFee;

        const match: GameMatch = {
          id: matchId,
          gameType: gameType as any,
          player1: {
            userId: opponent.userId,
            username: opponent.username,
            betAmount: betAmount,
            ready: true,
            joinedAt: opponent.joinedAt
          },
          player2: {
            userId: userId,
            username: username,
            betAmount: betAmount,
            ready: true,
            joinedAt: new Date()
          },
          status: 'active',
          totalPot,
          platformFee,
          winnerAmount,
          gameData: this.initializeGameData(gameType),
          createdAt: new Date(),
          startedAt: new Date(),
          matchType
        };

        this.activeMatches.set(matchId, match);
        
        // Remove both players from queue
        this.matchmakingQueue = this.matchmakingQueue.filter(
          player => player.userId !== userId && player.userId !== opponent.userId
        );

        return { success: true, matchId };
      } else {
        // Add to queue
        this.matchmakingQueue.push({
          userId,
          username,
          gameType,
          betAmount,
          joinedAt: new Date(),
          matchType,
          preferences
        });

        return { success: true };
      }
    } catch (error) {
      console.error('Error joining matchmaking:', error);
      return { success: false, error: 'Failed to join matchmaking' };
    }
  }

  // Get matchmaking status
  static async getMatchmakingStatus(userId: string): Promise<{ success: boolean; inQueue?: boolean; matchId?: string; error?: string }> {
    try {
      const inQueue = this.matchmakingQueue.some(player => player.userId === userId);
      
      if (inQueue) {
        return { success: true, inQueue: true };
      }

      // Check if user has an active match
      const activeMatch = Array.from(this.activeMatches.values()).find(
        match => (match.player1.userId === userId || match.player2?.userId === userId) && match.status === 'active'
      );

      if (activeMatch) {
        return { success: true, inQueue: false, matchId: activeMatch.id };
      }

      return { success: true, inQueue: false };
    } catch (error) {
      console.error('Error getting matchmaking status:', error);
      return { success: false, error: 'Failed to get matchmaking status' };
    }
  }

  // Leave matchmaking queue
  static async leaveMatchmaking(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.matchmakingQueue = this.matchmakingQueue.filter(player => player.userId !== userId);
      return { success: true };
    } catch (error) {
      console.error('Error leaving matchmaking:', error);
      return { success: false, error: 'Failed to leave matchmaking' };
    }
  }

  // Get match details
  static async getMatch(matchId: string): Promise<{ success: boolean; match?: GameMatch; error?: string }> {
    try {
      const match = this.activeMatches.get(matchId);
      if (!match) {
        return { success: false, error: 'Match not found' };
      }
      return { success: true, match };
    } catch (error) {
      console.error('Error getting match:', error);
      return { success: false, error: 'Failed to get match' };
    }
  }

  // Make a move in a game
  static async makeMove(matchId: string, userId: string, move: any): Promise<{ success: boolean; gameData?: any; isGameOver?: boolean; winner?: string; error?: string }> {
    try {
      const match = this.activeMatches.get(matchId);
      if (!match) {
        return { success: false, error: 'Match not found' };
      }

      if (match.status !== 'active') {
        return { success: false, error: 'Match is not active' };
      }

      // Validate move
      if (!this.validateMove(match.gameType, match.gameData, move, userId)) {
        return { success: false, error: 'Invalid move' };
      }

      // Apply move
      const updatedGameData = this.applyMove(match.gameType, match.gameData, move, userId);
      match.gameData = updatedGameData;

      // Check if game is over
      const gameEnd = this.checkGameEnd(match.gameType, updatedGameData, userId);
      
      if (gameEnd.isGameOver) {
        match.status = 'completed';
        match.completedAt = new Date();
        match.duration = match.completedAt.getTime() - match.startedAt!.getTime();
        
        if (gameEnd.winner) {
          const winner = gameEnd.winner === match.player1.userId ? match.player1.userId : match.player2!.userId;
          const loser = winner === match.player1.userId ? match.player2!.userId : match.player1.userId;
          
          match.winner = winner;
          match.loser = loser;
          
          await this.finalizeMatch(matchId, winner, loser);
        }
      }

      return {
        success: true,
        gameData: updatedGameData,
        isGameOver: gameEnd.isGameOver,
        winner: gameEnd.winner
      };
    } catch (error) {
      console.error('Error making move:', error);
      return { success: false, error: 'Failed to make move' };
    }
  }

  // Finalize match and handle payouts
  private static async finalizeMatch(matchId: string, winner: string, loser: string | undefined): Promise<void> {
    try {
      const match = this.activeMatches.get(matchId);
      if (!match) return;
      // Save game result
      await this.saveGameResult(match, winner, loser);
      // All wallet operations are handled by the backend. Always fetch updated balances after a match.
      // No local wallet transfer logic here.
      console.log(`Match ${matchId} finalized. Winner: ${winner}, Loser: ${loser}`);
    } catch (error) {
      console.error('Error finalizing match:', error);
    }
  }

  // Initialize game data based on game type
  private static initializeGameData(gameType: string): any {
    switch (gameType) {
      case 'connect_four':
        return {
          board: Array(6).fill(null).map(() => Array(7).fill(null)),
          currentPlayer: 'player1',
          lastMove: null
        };
      case 'tic_tac_toe':
        return {
          board: Array(5).fill(null).map(() => Array(5).fill(null)),
          currentPlayer: 'player1',
          lastMove: null
        };
      case 'dice_battle':
        return {
          player1Dice: [0, 0],
          player2Dice: [0, 0],
          player1Score: 0,
          player2Score: 0,
          currentRound: 1,
          maxRounds: 5,
          currentPlayer: 'player1',
          roundResults: []
        };
      case 'diamond_hunt':
        return {
          grid: this.generateDiamondGrid(),
          player1Score: 0,
          player2Score: 0,
          currentPlayer: 'player1',
          revealedCells: new Set(),
          gamePhase: 'hunting'
        };
      default:
        return {};
    }
  }

  // Validate move based on game type
  private static validateMove(gameType: string, gameData: any, move: any, playerId: string): boolean {
    switch (gameType) {
      case 'connect_four':
        return this.validateConnectFourMove(gameData, move);
      case 'tic_tac_toe':
        return this.validateTicTacToeMove(gameData, move);
      case 'dice_battle':
        return this.validateDiceBattleMove(gameData, move);
      case 'diamond_hunt':
        return this.validateDiamondHuntMove(gameData, move);
      default:
        return false;
    }
  }

  // Apply move based on game type
  private static applyMove(gameType: string, gameData: any, move: any, playerId: string): any {
    switch (gameType) {
      case 'connect_four':
        return this.applyConnectFourMove(gameData, move, playerId);
      case 'tic_tac_toe':
        return this.applyTicTacToeMove(gameData, move, playerId);
      case 'dice_battle':
        return this.applyDiceBattleMove(gameData, move, playerId);
      case 'diamond_hunt':
        return this.applyDiamondHuntMove(gameData, move, playerId);
      default:
        return gameData;
    }
  }

  // Check if game is over based on game type
  private static checkGameEnd(gameType: string, gameData: any, lastPlayerId: string): { isGameOver: boolean; winner?: string } {
    switch (gameType) {
      case 'connect_four':
        return this.checkConnectFourEnd(gameData, lastPlayerId);
      case 'tic_tac_toe':
        return this.checkTicTacToeEnd(gameData, lastPlayerId);
      case 'dice_battle':
        return this.checkDiceBattleEnd(gameData);
      case 'diamond_hunt':
        return this.checkDiamondHuntEnd(gameData);
      default:
        return { isGameOver: false };
    }
  }

  // Connect Four specific methods
  private static validateConnectFourMove(gameData: any, move: any): boolean {
    const { column } = move;
    return column >= 0 && column < 7 && gameData.board[0][column] === null;
  }

  private static applyConnectFourMove(gameData: any, move: any, playerId: string): any {
    const { column } = move;
    const newBoard = gameData.board.map((row: any[]) => [...row]);
    
    // Find the lowest empty cell in the column
    for (let row = 5; row >= 0; row--) {
      if (newBoard[row][column] === null) {
        newBoard[row][column] = playerId;
        break;
      }
    }

    return {
      ...gameData,
      board: newBoard,
      currentPlayer: gameData.currentPlayer === 'player1' ? 'player2' : 'player1',
      lastMove: { row: 5, column }
    };
  }

  private static checkConnectFourEnd(gameData: any, lastPlayerId: string): { isGameOver: boolean; winner?: string } {
    const { board, lastMove } = gameData;
    if (!lastMove) return { isGameOver: false };

    const { row, column } = lastMove;
    const player = board[row][column];

    // Check horizontal
    for (let c = Math.max(0, column - 3); c <= Math.min(3, column); c++) {
      if (board[row][c] === player && 
          board[row][c + 1] === player && 
          board[row][c + 2] === player && 
          board[row][c + 3] === player) {
        return { isGameOver: true, winner: lastPlayerId };
      }
    }

    // Check vertical
    for (let r = Math.max(0, row - 3); r <= Math.min(2, row); r++) {
      if (board[r][column] === player && 
          board[r + 1][column] === player && 
          board[r + 2][column] === player && 
          board[r + 3][column] === player) {
        return { isGameOver: true, winner: lastPlayerId };
      }
    }

    // Check diagonal (top-left to bottom-right)
    for (let r = Math.max(0, row - 3); r <= Math.min(2, row); r++) {
      for (let c = Math.max(0, column - 3); c <= Math.min(3, column); c++) {
        if (board[r][c] === player && 
            board[r + 1][c + 1] === player && 
            board[r + 2][c + 2] === player && 
            board[r + 3][c + 3] === player) {
          return { isGameOver: true, winner: lastPlayerId };
        }
      }
    }

    // Check diagonal (top-right to bottom-left)
    for (let r = Math.max(0, row - 3); r <= Math.min(2, row); r++) {
      for (let c = Math.max(3, column); c <= Math.min(6, column + 3); c++) {
        if (board[r][c] === player && 
            board[r + 1][c - 1] === player && 
            board[r + 2][c - 2] === player && 
            board[r + 3][c - 3] === player) {
          return { isGameOver: true, winner: lastPlayerId };
        }
      }
    }

    // Check for draw
    const isDraw = board[0].every((cell: any) => cell !== null);
    if (isDraw) {
      return { isGameOver: true };
    }

    return { isGameOver: false };
  }

  // Tic Tac Toe specific methods
  private static validateTicTacToeMove(gameData: any, move: any): boolean {
    const { row, column } = move;
    return row >= 0 && row < 5 && column >= 0 && column < 5 && gameData.board[row][column] === null;
  }

  private static applyTicTacToeMove(gameData: any, move: any, playerId: string): any {
    const { row, column } = move;
    const newBoard = gameData.board.map((row: any[]) => [...row]);
    newBoard[row][column] = playerId;

    return {
      ...gameData,
      board: newBoard,
      currentPlayer: gameData.currentPlayer === 'player1' ? 'player2' : 'player1',
      lastMove: { row, column }
    };
  }

  private static checkTicTacToeEnd(gameData: any, lastPlayerId: string): { isGameOver: boolean; winner?: string } {
    const { board, lastMove } = gameData;
    if (!lastMove) return { isGameOver: false };

    const { row, column } = lastMove;
    const player = board[row][column];

    // Check row
    let count = 0;
    for (let c = 0; c < 5; c++) {
      if (board[row][c] === player) count++;
    }
    if (count >= 4) return { isGameOver: true, winner: lastPlayerId };

    // Check column
    count = 0;
    for (let r = 0; r < 5; r++) {
      if (board[r][column] === player) count++;
    }
    if (count >= 4) return { isGameOver: true, winner: lastPlayerId };

    // Check diagonals
    if (row === column) {
      count = 0;
      for (let i = 0; i < 5; i++) {
        if (board[i][i] === player) count++;
      }
      if (count >= 4) return { isGameOver: true, winner: lastPlayerId };
    }

    if (row + column === 4) {
      count = 0;
      for (let i = 0; i < 5; i++) {
        if (board[i][4 - i] === player) count++;
      }
      if (count >= 4) return { isGameOver: true, winner: lastPlayerId };
    }

    // Check for draw
    const isDraw = board.every((row: any[]) => row.every((cell: any) => cell !== null));
    if (isDraw) {
      return { isGameOver: true };
    }

    return { isGameOver: false };
  }

  // Dice Battle specific methods
  private static validateDiceBattleMove(gameData: any, move: any): boolean {
    return move.type === 'roll' && gameData.currentRound <= gameData.maxRounds;
  }

  private static applyDiceBattleMove(gameData: any, move: any, playerId: string): any {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    const isPlayer1 = playerId === 'player1';
    const newGameData = { ...gameData };

    if (isPlayer1) {
      newGameData.player1Dice = [dice1, dice2];
      newGameData.player1Score += total;
    } else {
      newGameData.player2Dice = [dice1, dice2];
      newGameData.player2Score += total;
    }

    newGameData.currentPlayer = isPlayer1 ? 'player2' : 'player1';

    // Check if round is complete
    if (newGameData.player1Dice[0] > 0 && newGameData.player2Dice[0] > 0) {
      newGameData.currentRound++;
      newGameData.player1Dice = [0, 0];
      newGameData.player2Dice = [0, 0];
    }

    return newGameData;
  }

  private static checkDiceBattleEnd(gameData: any): { isGameOver: boolean; winner?: string } {
    if (gameData.currentRound > gameData.maxRounds) {
      if (gameData.player1Score > gameData.player2Score) {
        return { isGameOver: true, winner: 'player1' };
      } else if (gameData.player2Score > gameData.player1Score) {
        return { isGameOver: true, winner: 'player2' };
      } else {
        return { isGameOver: true }; // Draw
      }
    }
    return { isGameOver: false };
  }

  // Diamond Hunt specific methods
  private static generateDiamondGrid(): number[][] {
    const grid = Array(8).fill(null).map(() => Array(8).fill(0));
    const diamonds = 15;
    let placed = 0;

    while (placed < diamonds) {
      const row = Math.floor(Math.random() * 8);
      const col = Math.floor(Math.random() * 8);
      if (grid[row][col] === 0) {
        grid[row][col] = 1;
        placed++;
      }
    }

    return grid;
  }

  private static validateDiamondHuntMove(gameData: any, move: any): boolean {
    const { row, column } = move;
    return row >= 0 && row < 8 && column >= 0 && column < 8 && 
           !gameData.revealedCells.has(`${row}-${column}`);
  }

  private static applyDiamondHuntMove(gameData: any, move: any, playerId: string): any {
    const { row, column } = move;
    const newGameData = { ...gameData };
    newGameData.revealedCells.add(`${row}-${column}`);

    if (gameData.grid[row][column] === 1) {
      const isPlayer1 = playerId === 'player1';
      if (isPlayer1) {
        newGameData.player1Score++;
      } else {
        newGameData.player2Score++;
      }
    }

    newGameData.currentPlayer = playerId === 'player1' ? 'player2' : 'player1';

    return newGameData;
  }

  private static checkDiamondHuntEnd(gameData: any): { isGameOver: boolean; winner?: string } {
    const totalRevealed = gameData.revealedCells.size;
    const totalCells = 64;

    if (totalRevealed >= totalCells) {
      if (gameData.player1Score > gameData.player2Score) {
        return { isGameOver: true, winner: 'player1' };
      } else if (gameData.player2Score > gameData.player1Score) {
        return { isGameOver: true, winner: 'player2' };
      } else {
        return { isGameOver: true }; // Draw
      }
    }

    return { isGameOver: false };
  }

  // Helper methods
  private static isPlayerInActiveMatch(userId: string): boolean {
    return Array.from(this.activeMatches.values()).some(
      match => (match.player1.userId === userId || match.player2?.userId === userId) && match.status === 'active'
    );
  }

  private static async saveGameResult(match: GameMatch, winner: string, loser: string | undefined): Promise<void> {
    // In a real implementation, save to database
    console.log(`Game result saved: ${match.gameType} - Winner: ${winner}, Loser: ${loser}`);
  }

  private static startMatchmakingLoop(): void {
    setInterval(() => this.processMatchmakingQueue(), 5000);
  }

  private static startAutoCancelLoop(): void {
    setInterval(() => this.autoCancelExpiredMatches(), 10000);
  }

  private static processMatchmakingQueue(): void {
    // Process queue and create matches
    // This is a simplified version
  }

  private static autoCancelExpiredMatches(): void {
    const now = new Date();
    for (const [matchId, match] of this.activeMatches.entries()) {
      if (match.status === 'waiting' && 
          now.getTime() - match.createdAt.getTime() > 300000) { // 5 minutes
        match.status = 'cancelled';
        console.log(`Match ${matchId} auto-cancelled due to timeout`);
      }
    }
  }

  // Public API methods for statistics
  static async getGameStats(userId: string): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      // Mock statistics
      const stats = {
        totalGames: Math.floor(Math.random() * 100) + 50,
        wins: Math.floor(Math.random() * 40) + 20,
        losses: Math.floor(Math.random() * 30) + 15,
        draws: Math.floor(Math.random() * 10) + 5,
        totalWinnings: Math.floor(Math.random() * 1000) + 500,
        favoriteGame: ['connect_four', 'tic_tac_toe', 'dice_battle', 'diamond_hunt'][Math.floor(Math.random() * 4)],
        winRate: Math.floor(Math.random() * 30) + 50
      };

      return { success: true, stats };
    } catch (error) {
      console.error('Error getting game stats:', error);
      return { success: false, error: 'Failed to get game stats' };
    }
  }

  static async getGameHistory(userId: string, limit: number = 20): Promise<{ success: boolean; matches?: GameMatch[]; error?: string }> {
    try {
      // Mock game history
      const matches: GameMatch[] = [];
      for (let i = 0; i < limit; i++) {
        matches.push({
          id: `history-${i}`,
          gameType: ['connect_four', 'tic_tac_toe', 'dice_battle', 'diamond_hunt'][Math.floor(Math.random() * 4)] as any,
          player1: { userId: 'user1', username: 'Player1', betAmount: 10, ready: true, joinedAt: new Date() },
          player2: { userId: 'user2', username: 'Player2', betAmount: 10, ready: true, joinedAt: new Date() },
          status: 'completed',
          totalPot: 20,
          platformFee: 2,
          winnerAmount: 18,
          gameData: {},
          winner: Math.random() > 0.5 ? 'user1' : 'user2',
          loser: Math.random() > 0.5 ? 'user2' : 'user1',
          createdAt: new Date(Date.now() - Math.random() * 86400000 * 30),
          startedAt: new Date(),
          completedAt: new Date(),
          matchType: Math.random() > 0.5 ? 'real' : 'virtual'
        });
      }

      return { success: true, matches };
    } catch (error) {
      console.error('Error getting game history:', error);
      return { success: false, error: 'Failed to get game history' };
    }
  }

  static async getGameConfigs(): Promise<{ success: boolean; configs?: GameConfig[]; error?: string }> {
    try {
      const configs = Array.from(this.gameConfigs.values());
      return { success: true, configs };
    } catch (error) {
      console.error('Error getting game configs:', error);
      return { success: false, error: 'Failed to get game configs' };
    }
  }

  static async getAdminStats(): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      const stats = {
        totalMatches: this.activeMatches.size + Math.floor(Math.random() * 1000),
        activeMatches: this.activeMatches.size,
        totalRevenue: Math.floor(Math.random() * 10000) + 5000,
        platformFees: Math.floor(Math.random() * 1000) + 500,
        averageBetSize: Math.floor(Math.random() * 50) + 25,
        popularGame: 'connect_four',
        userEngagement: Math.floor(Math.random() * 20) + 80
      };

      return { success: true, stats };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return { success: false, error: 'Failed to get admin stats' };
    }
  }
}

// Initialize the Game API
GameAPI.initialize(); 