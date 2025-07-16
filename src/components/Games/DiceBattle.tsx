import React, { useState, useEffect } from 'react';
import { Dice6, Zap, Trophy, RotateCcw, Clock, Users, User, Crown, DollarSign, Info, X, CheckCircle, AlertCircle } from 'lucide-react';
import { GameBetModal } from './GameBetModal';
import { GameResultModal } from './GameResultModal';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { Gamepad2, Target } from 'lucide-react';
import { MatchmakingWaitingRoom } from './MatchmakingWaitingRoom';
import { getSocket, testSocket } from '../../utils/socket';
import { GameControls } from '../UI/GameControls';
import { getGameId } from '../../utils/gameId';
import { MatchChat } from './MatchChat';

interface DiceBattleProps {
  onGameEnd: (winner: string) => void;
}

interface RoundResult {
  round: number;
  player1Roll: number[];
  player2Roll: number[];
  player1Total: number;
  player2Total: number;
  winner: string | null;
  result: string;
}

interface GameState {
  round: number;
  maxRounds: number;
  playerRolls: Record<string, { dice: number[]; total: number; rolled: boolean }>;
  roundScores: Record<string, number>;
  roundHistory: RoundResult[];
  currentRoundComplete: boolean;
  gameOver: boolean;
  winner: string | null;
}

// Game configuration following the same pattern as other games
const DICE_BATTLE_CONFIG = {
  id: 'dice_battle',
  name: 'Dice Battle',
  description: 'Roll dice and outscore your opponent. First to 3 wins or highest total after 5 rounds!',
  minBet: 1,
  maxBet: 200,
  platformFeePercent: 10,
  isActive: true,
  maxWaitTime: 300,
  autoCancelTime: 600,
  timeLimit: 30,
  maxRounds: 5,
  winCondition: 3
};

export function DiceBattle({ onGameEnd }: DiceBattleProps) {
  const { user } = useAuth();
  const { walletMode } = useWalletMode();
  
  // Game state
  const [gameStatus, setGameStatus] = useState<'menu' | 'waiting' | 'playing' | 'finished'>('menu');
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null);
  const [currentStake, setCurrentStake] = useState(0);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState<{ isWin: boolean; isDraw: boolean }>({ isWin: false, isDraw: false });
  const [userBalances, setUserBalances] = useState<{ real_balance: number; virtual_balance: number }>({ real_balance: 0, virtual_balance: 0 });
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [showRules, setShowRules] = useState(false);
  
  // Dice battle specific state
  const [gameState, setGameState] = useState<GameState>({
    round: 1,
    maxRounds: DICE_BATTLE_CONFIG.maxRounds,
    playerRolls: {},
    roundScores: {},
    roundHistory: [],
    currentRoundComplete: false,
    gameOver: false,
    winner: null
  });
  
  // UI state
  const [playerDice, setPlayerDice] = useState<number[]>([1, 1]);
  const [opponentDice, setOpponentDice] = useState<number[]>([1, 1]);
  const [isRolling, setIsRolling] = useState(false);
  const [showOpponentDice, setShowOpponentDice] = useState(false);
  const [turnTimer, setTurnTimer] = useState(DICE_BATTLE_CONFIG.timeLimit);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [roundResult, setRoundResult] = useState<{
    playerTotal: number;
    opponentTotal: number;
    winner: string | null;
    resultText: string;
  } | null>(null);
  const [gameResult, setGameResult] = useState<{
    winner: string | null;
    finalScore: Record<string, number>;
    reason: string;
  } | null>(null);

  // Add state for interrupted match
  const [matchInterrupted, setMatchInterrupted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Load user balances
  useEffect(() => {
    if (user?.id) {
      loadUserBalances();
    }
  }, [user?.id, walletMode]);

  const loadUserBalances = async () => {
    setLoadingBalances(true);
    try {
      const response = await fetch(import.meta.env.VITE_API_URL + '/api/wallet/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chanspaw_access_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserBalances(data.data);
        return data.data;
      }
    } catch (error) {
      console.error('Failed to load balances:', error);
    }
    setLoadingBalances(false);
    return { real_balance: 0, virtual_balance: 0 };
  };

  const handlePlayGame = async () => {
    const freshBalances = await loadUserBalances();
    if (freshBalances) {
      setShowBetModal(true);
    } else {
      alert('Failed to load wallet balances. Please try again.');
    }
  };

  const handleBetConfirmed = (stakeAmount: number) => {
    // Validate stake amount against game configuration
    if (stakeAmount < DICE_BATTLE_CONFIG.minBet || stakeAmount > DICE_BATTLE_CONFIG.maxBet) {
      alert(`Bet amount must be between ${DICE_BATTLE_CONFIG.minBet} and ${DICE_BATTLE_CONFIG.maxBet} ${walletMode === 'real' ? 'USD' : 'coins'}`);
      return;
    }

    // Check if user has sufficient balance
    const currentBalance = walletMode === 'real' ? userBalances.real_balance : userBalances.virtual_balance;
    if (currentBalance < stakeAmount) {
      alert(`Insufficient ${walletMode === 'real' ? 'real money' : 'virtual coins'} balance`);
      return;
    }

    setCurrentStake(stakeAmount);
    setGameStatus('waiting');
    setIsInWaitingRoom(true);
    setShowBetModal(false);
    
    const isConnected = testSocket();
    console.log('🔍 Socket connected before joinQueue:', isConnected);
    
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('joinQueue', {
        stake: stakeAmount,
        walletMode,
        gameId: getGameId('dice-battle'),
      });
      console.log('✅ Sent joinQueue', { stake: stakeAmount, walletMode, gameId: getGameId('dice-battle') });
    } else {
      console.error('❌ Socket not connected, cannot join queue');
      alert('Connection error. Please refresh the page and try again.');
      setGameStatus('menu');
      setIsInWaitingRoom(false);
    }
  };

  const handleWaitingRoomCancel = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('cancelQueue');
      console.log('Sent cancelQueue');
    }
    setGameStatus('menu');
    setIsInWaitingRoom(false);
    setCurrentStake(0);
  };

  const handlePracticeMode = () => {
    setGameStatus('playing');
    setIsPracticeMode(true);
    setIsMyTurn(true);
    initializeGame();
  };

  const initializeGame = () => {
    setGameState({
      round: 1,
      maxRounds: DICE_BATTLE_CONFIG.maxRounds,
      playerRolls: {},
      roundScores: { [user?.id || '']: 0, [opponentId || '']: 0 },
      roundHistory: [],
      currentRoundComplete: false,
      gameOver: false,
      winner: null
    });
    setPlayerDice([1, 1]);
    setOpponentDice([1, 1]);
    setIsRolling(false);
    setShowOpponentDice(false);
    setRoundResult(null);
    setGameResult(null);
    setTurnTimer(DICE_BATTLE_CONFIG.timeLimit);
    setWaitingForOpponent(false);
  };

  // Only allow local dice rolling and winner logic in practice mode
  const rollDice = () => {
    if (!isMyTurn || gameState.gameOver || gameStatus !== 'playing') return;
    // Prevent double roll
    if (gameState.playerRolls[user?.id || '']?.rolled) return;
    setIsRolling(true);
    setShowOpponentDice(false);
    setRoundResult(null);
    setTimeout(() => {
      const newDice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
      ];
      setPlayerDice(newDice);
      setIsRolling(false);
      if (isPracticeMode) {
        // PRACTICE MODE: local logic only
        setTimeout(() => {
          const opponentDiceRoll = [
            Math.floor(Math.random() * 6) + 1,
            Math.floor(Math.random() * 6) + 1
          ];
          setOpponentDice(opponentDiceRoll);
          setShowOpponentDice(true);
          const playerTotal = newDice[0] + newDice[1];
          const opponentTotal = opponentDiceRoll[0] + opponentDiceRoll[1];
          let winner = null;
          let resultText = '';
          if (playerTotal > opponentTotal) {
            winner = 'player';
            resultText = 'You won this round!';
          } else if (opponentTotal > playerTotal) {
            winner = 'opponent';
            resultText = 'Opponent won this round!';
          } else {
            resultText = 'It\'s a tie!';
          }
          setRoundResult({ playerTotal, opponentTotal, winner, resultText });
          setGameState(prev => ({
            ...prev,
            roundScores: {
              ...prev.roundScores,
              [user?.id || '']: prev.roundScores[user?.id || ''] + (winner === 'player' ? 1 : 0),
              [opponentId || '']: prev.roundScores[opponentId || ''] + (winner === 'opponent' ? 1 : 0)
            },
            roundHistory: [...prev.roundHistory, {
              round: prev.round,
              player1Roll: newDice,
              player2Roll: opponentDiceRoll,
              player1Total: playerTotal,
              player2Total: opponentTotal,
              winner: winner === 'player' ? user?.id || '' : winner === 'opponent' ? opponentId || '' : null,
              result: resultText
            }]
          }));
          setTimeout(() => {
            const newScores = {
              [user?.id || '']: gameState.roundScores[user?.id || ''] + (winner === 'player' ? 1 : 0),
              [opponentId || '']: gameState.roundScores[opponentId || ''] + (winner === 'opponent' ? 1 : 0)
            };
            if (newScores[user?.id || ''] >= DICE_BATTLE_CONFIG.winCondition || newScores[opponentId || ''] >= DICE_BATTLE_CONFIG.winCondition) {
              const finalWinner = newScores[user?.id || ''] >= DICE_BATTLE_CONFIG.winCondition ? user?.id || '' : opponentId || '';
              setGameResult({ winner: finalWinner, finalScore: newScores, reason: finalWinner === user?.id ? 'You won the match!' : 'Opponent won the match!' });
              setGameState(prev => ({ ...prev, gameOver: true, winner: finalWinner }));
              onGameEnd(finalWinner);
            } else {
              setGameState(prev => ({ ...prev, round: prev.round + 1, playerRolls: {}, roundScores: newScores }));
              setPlayerDice([1, 1]);
              setOpponentDice([1, 1]);
              setRoundResult(null);
              setTurnTimer(DICE_BATTLE_CONFIG.timeLimit);
            }
          }, 2000);
        }, 1000);
      } else {
        // ONLINE: emit move to server ONLY, never calculate winner or round locally
        const socket = getSocket();
        if (socket) {
          socket.emit('makeMove', {
            matchId: currentMatchId,
            gameType: 'dice_battle',
            move: { type: 'roll', dice: newDice, total: newDice[0] + newDice[1] }
          });
        }
        setIsMyTurn(false); // Lock out further rolls until server responds
        setWaitingForOpponent(true);
      }
    }, 800);
  };

  const resetGame = () => {
    setGameStatus('menu');
    setIsPracticeMode(false);
    setCurrentMatchId(null);
    setCurrentStake(0);
    setOpponentId(null);
    setGameResult(null);
    setRoundResult(null);
    setPlayerDice([1, 1]);
    setOpponentDice([1, 1]);
    setIsRolling(false);
    setShowOpponentDice(false);
    setTurnTimer(DICE_BATTLE_CONFIG.timeLimit);
    setIsMyTurn(false);
    setWaitingForOpponent(false);
  };

  const handleResultModalClose = () => {
    setShowResultModal(false);
    resetGame();
  };

  // Socket event handlers
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onMatchFound = (data: any) => {
      console.log('🎯 Match found:', data);
      setCurrentMatchId(data.matchId);
      setOpponentId(data.opponentId);
      setGameStatus('playing');
      setIsInWaitingRoom(false);
      initializeGame();
    };

    const onGameStart = (data: any) => {
      console.log('🎮 Dice Battle gameStart received:', data);
      setCurrentMatchId(data.matchId);
      setOpponentId(data.opponentId);
      setCurrentStake(data.stake);
      setIsMyTurn(data.yourTurn !== undefined ? data.yourTurn : (data.firstPlayer === user?.id));
      setGameStatus('playing');
      setIsInWaitingRoom(false);
      setTurnTimer(DICE_BATTLE_CONFIG.timeLimit);
      initializeGame();
    };

    const onMoveMade = (data: any) => {
      console.log('🎲 Move made:', data);
      // Si backend la voye gameOver, mete tout eta final yo
      if (data.gameOver) {
        setGameResult({
          winner: data.winner,
          finalScore: data.finalScore,
          reason: data.reason || ''
        });
        setGameState(prev => ({
          ...prev,
          gameOver: true,
          winner: data.winner,
          roundScores: data.finalScore || prev.roundScores,
          roundHistory: data.roundHistory || prev.roundHistory
        }));
        setIsMyTurn(false);
        setWaitingForOpponent(false);
        setShowResultModal(true);
        setResultModalData({
          isWin: data.winner === user?.id,
          isDraw: !data.winner
        });
        return;
      }
      // Ajiste tout eta dapre backend la
      if (data.round !== undefined) setGameState(prev => ({ ...prev, round: data.round }));
      if (data.currentScore) setGameState(prev => ({ ...prev, roundScores: data.currentScore }));
      if (data.roundHistory) setGameState(prev => ({ ...prev, roundHistory: data.roundHistory }));
      // Si backend la di se ou menm ki gen turn, mete isMyTurn true
      if (data.currentTurnPlayerId && data.currentTurnPlayerId === user?.id) {
        setIsMyTurn(true);
        setWaitingForOpponent(false);
      } else {
        setIsMyTurn(false);
        setWaitingForOpponent(true);
      }
      // Mete dice yo si yo egziste
      if (data.player1Roll && data.player2Roll) {
        if (user?.id === (data.player1Id || data.player1)) {
          setPlayerDice(data.player1Roll);
          setOpponentDice(data.player2Roll);
        } else {
          setPlayerDice(data.player2Roll);
          setOpponentDice(data.player1Roll);
        }
      }
      // Si gen roundResult, mete l pou UI
      if (data.roundResult) {
        setRoundResult({
          playerTotal: data.roundResult.player1Total,
          opponentTotal: data.roundResult.player2Total,
          winner: data.roundResult.winner === user?.id ? 'player' : data.roundResult.winner ? 'opponent' : null,
          resultText: data.roundResult.result
        });
      } else {
        setRoundResult(null);
      }
    };

    const onYourTurn = (data: any) => {
      console.log('🎯 Your turn:', data);
      setIsMyTurn(true);
      setWaitingForOpponent(false);
      setTurnTimer(DICE_BATTLE_CONFIG.timeLimit);
      setRoundResult(null);
      setPlayerDice([1, 1]);
      setOpponentDice([1, 1]);
      setShowOpponentDice(false);
      // Ajiste round si backend la voye l
      if (data.round !== undefined) setGameState(prev => ({ ...prev, round: data.round }));
    };

    const onMatchEnded = (data: any) => {
      console.log('🏁 Match ended:', data);
      setGameResult({
        winner: data.winner,
        finalScore: data.finalScore,
        reason: data.reason
      });
      setGameState(prev => ({ ...prev, gameOver: true, winner: data.winner }));
      
      // Show result modal
      setResultModalData({
        isWin: data.winner === user?.id,
        isDraw: !data.winner
      });
      setShowResultModal(true);
      
      // Call onGameEnd callback
      onGameEnd(data.winner || '');
    };

    const onTimeout = (data: any) => {
      console.log('⏰ Timeout:', data);
      if (data.playerId === user?.id) {
        // We timed out
        setGameResult({
          winner: data.opponentId,
          finalScore: data.finalScore,
          reason: 'You timed out!'
        });
        setGameState(prev => ({ ...prev, gameOver: true, winner: data.opponentId }));
        
        setResultModalData({
          isWin: false,
          isDraw: false
        });
        setShowResultModal(true);
        onGameEnd(data.opponentId);
      } else {
        // Opponent timed out
        setGameResult({
          winner: user?.id || '',
          finalScore: data.finalScore,
          reason: 'Opponent timed out!'
        });
        setGameState(prev => ({ ...prev, gameOver: true, winner: user?.id || '' }));
        
        setResultModalData({
          isWin: true,
          isDraw: false
        });
        setShowResultModal(true);
        onGameEnd(user?.id || '');
      }
    };

    // Ajoute yon event handler pou erè/disconnect oswa fallback
    socket.on('disconnect', () => {
      if (gameStatus === 'playing' && !gameState.gameOver) {
        setMatchInterrupted(true);
        setGameState(prev => ({ ...prev, gameOver: true }));
      }
    });

    socket.on('matchFound', onMatchFound);
    socket.on('gameStart', onGameStart);
    socket.on('moveMade', onMoveMade);
    socket.on('yourTurn', onYourTurn);
    socket.on('matchEnded', onMatchEnded);
    socket.on('timeout', onTimeout);

    return () => {
      socket.off('matchFound', onMatchFound);
      socket.off('gameStart', onGameStart);
      socket.off('moveMade', onMoveMade);
      socket.off('yourTurn', onYourTurn);
      socket.off('matchEnded', onMatchEnded);
      socket.off('timeout', onTimeout);
      socket.off('disconnect');
    };
  }, [user?.id, currentMatchId, gameState.playerRolls, gameState.roundScores, gameState.round, onGameEnd, gameStatus, gameState.gameOver]);

  // Turn timer
  useEffect(() => {
    console.log('⏰ DiceBattle Timer effect:', { gameStatus, isMyTurn, gameState: gameState.gameOver, turnTimer });
    
    // STOP TIMER IMMEDIATELY IF GAME IS OVER
    if (gameState.gameOver || gameStatus !== 'playing') {
      console.log('⏰ DiceBattle Timer stopped: Game over or not playing');
      return;
    }
    
    if (gameStatus === 'playing' && isMyTurn && !gameState.gameOver && turnTimer > 0) {
      console.log('⏰ DiceBattle Starting timer countdown');
      const timer = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            console.log('⏰ DiceBattle Turn timer expired!');
            // Timeout - forfeit turn
            if (!isPracticeMode) {
              const socket = getSocket();
              if (socket) {
                socket.emit('timeout', { matchId: currentMatchId });
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        console.log('⏰ DiceBattle Clearing timer');
        clearInterval(timer);
      };
    }
  }, [gameStatus, isMyTurn, gameState.gameOver, isPracticeMode, currentMatchId]); // REMOVED turnTimer FROM DEPENDENCIES

  // 3D Dice Component
  const Dice3D = ({ value, color, isRolling, isVisible = true, small = false }: { 
    value: number; 
    color: string; 
    isRolling: boolean;
    isVisible?: boolean;
    small?: boolean;
  }) => {
    const getDiceFace = (value: number) => {
      const dots = [];
      const positions = {
        1: [[2, 2]],
        2: [[1, 1], [3, 3]],
        3: [[1, 1], [2, 2], [3, 3]],
        4: [[1, 1], [1, 3], [3, 1], [3, 3]],
        5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
        6: [[1, 1], [1, 2], [1, 3], [3, 1], [3, 2], [3, 3]]
      };
      
      const pos = positions[value as keyof typeof positions] || [];
      
      return pos.map(([row, col], index) => (
        <div
          key={index}
          className={`absolute w-1 h-1 bg-black rounded-full ${
            small ? 'w-0.5 h-0.5' : 'w-1 h-1'
          }`}
          style={{
            top: `${(row - 1) * 33.33}%`,
            left: `${(col - 1) * 33.33}%`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ));
    };

    const size = small ? 'w-8 h-8' : 'w-16 h-16';
    const bgColor = 'bg-white';
    const borderColor = 'border-gray-300';

    return (
      <div
        className={`${size} relative ${bgColor} rounded-lg border-2 ${borderColor} shadow-lg transform transition-all duration-300 ${
          isRolling ? 'dice-rolling' : ''
        } ${!isVisible ? 'opacity-50' : ''}`}
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1000px'
        }}
      >
        {getDiceFace(value)}
      </div>
    );
  };

  // Dice Display Component
  const DiceDisplay = ({ dice, color, isPlayer = false, small = false }: { 
    dice: number[]; 
    color: string; 
    isPlayer?: boolean; 
    small?: boolean; 
  }) => (
    <div className="flex space-x-4">
      <Dice3D 
        value={dice[0]} 
        color={color} 
        isRolling={isRolling && isPlayer} 
        isVisible={true}
        small={small}
      />
      <Dice3D 
        value={dice[1]} 
        color={color} 
        isRolling={isRolling && isPlayer} 
        isVisible={true}
        small={small}
      />
    </div>
  );

  // Score Display Component
  const ScoreDisplay = () => {
    const playerScore = gameState.roundScores[user?.id || ''] || 0;
    const opponentScore = gameState.roundScores[opponentId || ''] || 0;

    return (
      <div className="bg-card-gradient rounded-xl border border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold text-gaming-accent">You</div>
            <div className="text-4xl font-bold text-gaming-accent">{playerScore}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-400">vs</div>
            <div className="text-sm text-gray-500">Best of {DICE_BATTLE_CONFIG.maxRounds}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">Opponent</div>
            <div className="text-4xl font-bold text-red-400">{opponentScore}</div>
          </div>
        </div>
      </div>
    );
  };

  // Round history
  const RoundHistory = () => (
    <div className="mt-6 p-4 bg-card-gradient rounded-xl border border-gray-700">
      <h3 className="text-lg font-semibold mb-3 text-white">Round History</h3>
      <div className="space-y-2">
        {gameState.roundHistory.map((round, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gaming-dark rounded-lg border border-gray-700">
            <div className="text-sm font-medium text-gray-300">Round {round.round}</div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="text-gaming-accent">{round.player1Total}</span>
                <span className="text-gray-400">vs</span>
                <span className="text-red-400">{round.player2Total}</span>
              </div>
              <div className={`text-xs px-2 py-1 rounded ${
                round.winner === user?.id ? 'bg-green-900/20 text-green-400 border border-green-500/20' :
                round.winner === opponentId ? 'bg-red-900/20 text-red-400 border border-red-500/20' :
                'bg-gray-900/20 text-gray-400 border border-gray-500/20'
              }`}>
                {round.winner === user?.id ? 'You won' :
                 round.winner === opponentId ? 'Opponent won' : 'Draw'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Ajoute modal pou match interrupted
  if (matchInterrupted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gaming-gradient">
        <div className="bg-card-gradient rounded-xl p-8 border border-gray-700 shadow-xl text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Match Interrupted</h2>
          <p className="text-gray-300 mb-6">The match was interrupted due to a connection issue or your opponent left. You can return to the games list.</p>
          <button
            className="bg-gradient-to-r from-emerald-400 to-blue-400 text-white font-bold py-3 px-8 rounded shadow-lg hover:opacity-90 transition"
            onClick={() => window.location.reload()}
          >
            Return to Games
          </button>
        </div>
      </div>
    );
  }

  // Ajoute modal pou rezilta (You Win, You Lose, Draw)
  if (showResultModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gaming-gradient">
        <div className="bg-card-gradient rounded-xl p-8 border border-gray-700 shadow-xl text-center max-w-md mx-auto">
          {resultModalData.isWin ? (
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          ) : resultModalData.isDraw ? (
            <Info className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          ) : (
            <X className="w-12 h-12 text-red-400 mx-auto mb-4" />
          )}
          <h2 className="text-2xl font-bold text-white mb-2">
            {resultModalData.isWin ? 'Congratulations! You Won' : resultModalData.isDraw ? 'Draw' : 'You Lose'}
          </h2>
          <p className="text-gray-300 mb-6">
            {resultModalData.isWin
              ? 'You outscored your opponent and won the match!'
              : resultModalData.isDraw
              ? 'The match ended in a draw.'
              : 'Better luck next time!'}
          </p>
          <button
            className="bg-gradient-to-r from-emerald-400 to-blue-400 text-white font-bold py-3 px-8 rounded shadow-lg hover:opacity-90 transition mb-2"
            onClick={() => window.location.reload()}
          >
            Return to Games
          </button>
          <button
            className="bg-gaming-dark text-white font-bold py-2 px-6 rounded shadow hover:bg-gaming-accent/20 transition"
            onClick={() => {
              setShowResultModal(false);
              resetGame();
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  if (gameStatus === 'menu') {
    return (
      <div className="min-h-screen bg-gaming-gradient flex items-center justify-center p-4">
        <div className="max-w-2xl w-full mx-auto">
          {/* Game Title & Description */}
          <div className="bg-card-gradient rounded-2xl border border-gray-700 shadow-xl p-8 mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-gaming-accent to-purple-600 rounded-full inline-block">
                <Dice6 className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{DICE_BATTLE_CONFIG.name}</h1>
            <p className="text-gray-400 text-lg mb-2">{DICE_BATTLE_CONFIG.description}</p>
          </div>

          {/* Play 1v1 and Practice Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Play 1v1 for Money Card */}
            <div className="card-mobile text-center">
              <DollarSign className="h-12 w-12 text-gaming-gold mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Play 1v1 for Money</h3>
              <p className="text-gray-400 mb-4 text-sm">Challenge other players and bet real money. Winner takes 90% of the pot!</p>
              <button
                onClick={handlePlayGame}
                className="w-full btn-mobile bg-gradient-to-r from-emerald-400 to-blue-400 hover:opacity-90 text-white relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                Play 1v1 (Virtual Coins)
              </button>
            </div>

            {/* Practice Mode Card */}
            <div className="card-mobile text-center">
              <Users className="h-12 w-12 text-gaming-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Practice Mode</h3>
              <p className="text-gray-400 mb-4 text-sm">Play against computer AI to practice your skills without betting.</p>
              <button
                onClick={handlePracticeMode}
                className="w-full btn-mobile bg-gradient-to-r from-red-300 to-yellow-200 hover:from-red-200 hover:to-yellow-100 text-gray-800 font-semibold relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                Practice vs Computer
              </button>
            </div>
          </div>

          {/* How to Play Section */}
          <div className="mt-8 p-4 bg-gaming-dark rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">How to Play</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">1. Roll Dice</h4>
                <p>On your turn, click the "Roll Dice" button to roll two dice. Your opponent will do the same on their turn.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">2. Win Rounds</h4>
                <p>Whoever rolls the highest total wins the round. First to 3 round wins (best of 5) wins the match!</p>
              </div>
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">3. Time Limit</h4>
                <p>Each turn has a 30-second timer. If you run out of time, you forfeit the round.</p>
              </div>
            </div>
          </div>

          {/* Bet Modal (shown when play button is clicked) */}
          {showBetModal && (
            <GameBetModal
              open={showBetModal}
              onClose={() => setShowBetModal(false)}
              onConfirm={handleBetConfirmed}
              gameType="dice_battle"
              userId={user?.id || ''}
              username={user?.username || ''}
              onBetConfirmed={handleBetConfirmed}
              userBalances={userBalances}
            />
          )}
        </div>
      </div>
    );
  }

  if (gameStatus === 'waiting') {
    return (
      <MatchmakingWaitingRoom
        gameType="dice_battle"
        stakeAmount={currentStake}
        onMatchFound={(matchId: string) => {
          setCurrentMatchId(matchId);
          setGameStatus('playing');
          setShowBetModal(false);
          initializeGame();
        }}
        onCancel={handleWaitingRoomCancel}
      />
    );
  }

  if (gameStatus === 'playing') {
    const playerScore = gameState.roundScores[user?.id || ''] || 0;
    const opponentScore = gameState.roundScores[opponentId || ''] || 0;
    const canRoll = !isRolling && !gameState.gameOver && !gameState.playerRolls[user?.id || '']?.rolled;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-card-gradient rounded-xl p-6 border border-gray-700 relative">
          {/* Scoreboard */}
          <div className="w-full flex flex-col items-center mb-2">
            <div className="flex items-center justify-center w-full max-w-xs bg-gaming-dark rounded-xl shadow-lg py-2 px-4 mb-1 border border-gray-700">
              <div className="flex-1 text-center">
                <div className="text-xs text-gray-300">You</div>
                <div className="text-2xl font-bold text-white">{playerScore}</div>
              </div>
              <div className="mx-2 px-4 py-1 rounded-lg bg-gaming-dark border border-gray-700 text-gray-300 font-bold text-lg">VS</div>
              <div className="flex-1 text-center">
                <div className="text-xs text-gray-300">Opponent</div>
                <div className="text-2xl font-bold text-white">{opponentScore}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500">Round {gameState.round} / {DICE_BATTLE_CONFIG.maxRounds}</div>
          </div>

          {/* Dice Row */}
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 mb-6">
            {/* Player Dice */}
            <div className="flex-1 flex flex-col items-center">
              <div className="text-xs text-gray-300 mb-1">You</div>
              <DiceDisplay dice={playerDice} color="white" isPlayer={true} />
            </div>
            {/* Center VS */}
            <div className="flex flex-col items-center justify-center mx-4">
              <div className="px-4 py-1 rounded-lg bg-gaming-dark border border-gray-700 text-gray-300 font-bold text-lg">VS</div>
            </div>
            {/* Opponent Dice */}
            <div className="flex-1 flex flex-col items-center">
              <div className="text-xs text-gray-300 mb-1">Opponent</div>
              <DiceDisplay dice={opponentDice} color="white" isPlayer={false} />
            </div>
          </div>

          {/* Turn Banner */}
          <div className="mb-4 w-full flex justify-center">
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-gaming-dark border border-gray-700 shadow font-bold text-white text-base`}>
              {isMyTurn ? (
                <User className="h-5 w-5 text-green-400 mr-2" />
              ) : (
                <Users className="h-5 w-5 text-blue-400 mr-2" />
              )}
              <span>{isMyTurn ? 'Your Turn' : 'Waiting for Opponent...'}</span>
            </div>
          </div>

          {/* Roll Dice button */}
          <div className="flex justify-center w-full mb-2">
            <button
              onClick={rollDice}
              disabled={!canRoll}
              className={`bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-base font-bold py-2 px-6 shadow-lg w-full max-w-xs disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRolling ? (
                <span className="flex items-center"><RotateCcw className="w-5 h-5 mr-2 animate-spin" /> Rolling...</span>
              ) : (
                'Roll Dice'
              )}
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-300">{turnTimer}s left</div>

          {/* Round Result */}
          {roundResult && (
            <div className="w-full flex flex-col items-center mt-4 mb-2">
              <div className="text-xl font-bold text-white mb-2">Round Result</div>
              <div className="flex items-center justify-center space-x-8 mb-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gaming-accent">You: {roundResult.playerTotal}</div>
                  <div className="text-sm text-gray-400">({playerDice[0]} + {playerDice[1]})</div>
                </div>
                <div className="text-4xl font-bold text-gray-500">vs</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">Opponent: {roundResult.opponentTotal}</div>
                  <div className="text-sm text-gray-400">({opponentDice[0]} + {opponentDice[1]})</div>
                </div>
              </div>
              <div className={`text-lg font-semibold ${
                roundResult.winner === 'player' ? 'text-green-400' :
                roundResult.winner === 'opponent' ? 'text-red-400' :
                'text-gray-400'
              }`}>{roundResult.resultText}</div>
            </div>
          )}

          {/* Round History Timeline */}
          <div className="w-full mt-6">
            <RoundHistory />
          </div>

          {/* Game Info Box (GameControls) */}
          <div className="w-full mt-6">
            <GameControls
              onNewGame={resetGame}
              onSurrender={() => {
                // Surrender logic: end game, send to server if needed
                if (gameStatus === 'playing' && !gameState.gameOver) {
                  const socket = getSocket();
                  if (socket && currentMatchId) {
                    socket.emit('gameEnd', {
                      matchId: currentMatchId,
                      winner: opponentId || '',
                      gameType: 'dice_battle',
                      result: 'player_surrendered',
                      opponentId
                    });
                  }
                  setGameState(prev => ({ ...prev, gameOver: true, winner: opponentId || null }));
                  setGameStatus('finished');
                }
              }}
              mode={isPracticeMode ? 'Practice' : '1v1 Match'}
              status={gameStatus}
              timeLeft={turnTimer}
              currentTurn={isPracticeMode ? (isMyTurn ? 'You' : 'Computer') : (isMyTurn ? 'You' : 'Opponent')}
              winCondition={`First to ${DICE_BATTLE_CONFIG.winCondition} or highest after ${DICE_BATTLE_CONFIG.maxRounds} rounds`}
              boardSize={"2 dice x 5 rounds"}
              symbols={"🎲"}
              stake={currentStake}
              walletMode={walletMode}
              showBalances={true}
              realBalance={userBalances.real_balance}
              virtualBalance={userBalances.virtual_balance}
              matchId={currentMatchId}
            />
          </div>
        </div>
        <MatchChat
          matchId={currentMatchId || ''}
          currentUserId={user?.id || ''}
          currentUsername={user?.username || ''}
          opponentName={opponentId || ''}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen((v) => !v)}
        />
      </div>
    );
  }

  return null;
} 