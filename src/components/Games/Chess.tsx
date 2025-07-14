import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Clock, Users, DollarSign, Trophy, AlertTriangle, Play, Bot, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { getSocket } from '../../utils/socket';
import { GameBetModal } from './GameBetModal';
import { GameResultModal } from './GameResultModal';
import { MatchmakingWaitingRoom } from './MatchmakingWaitingRoom';
import { ChessBoard } from './ChessBoard';
import { useChessEngine } from './useChessEngine';
import { getGameId } from '../../utils/gameId';
import { MatchChat } from './MatchChat';

interface ChessProps {
  onGameEnd?: (winnerId: string) => void;
  matchId?: string;
  opponent?: string;
  stake?: number;
  gameMode?: 'local' | 'online';
}

export function Chess({ onGameEnd, matchId, opponent, stake = 100, gameMode = 'online' }: ChessProps) {
  const { user } = useAuth();
  const { walletMode } = useWalletMode();
  
  // Game state
  const [gameStatus, setGameStatus] = useState<'menu' | 'waiting' | 'playing' | 'finished'>('menu');
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(matchId || null);
  const [currentStake, setCurrentStake] = useState(stake);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState<{ isWin: boolean; isDraw: boolean }>({ isWin: false, isDraw: false });
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [opponentId, setOpponentId] = useState<string | null>(opponent || null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastMove, setLastMove] = useState<string>('');
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [gameResult, setGameResult] = useState<{ winner: string; reason: string } | null>(null);
  const [pendingWinnerId, setPendingWinnerId] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string>('');
  const [showRules, setShowRules] = useState(false);
  const [rules, setRules] = useState<string>('');
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [userBalances, setUserBalances] = useState({ real_balance: 0, virtual_balance: 0 });
  const [timer, setTimer] = useState<number>(60);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [promotionModal, setPromotionModal] = useState<{ from: string; to: string } | null>(null);
  const [pendingMove, setPendingMove] = useState<any>(null);

  // Chess engine hook
  const chessEngine = useChessEngine();

  // Socket connection
  const socket = getSocket();

  // Load user balances
  const loadUserBalances = async () => {
    if (!user?.id) return false;
    
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
        setLoadingBalances(false);
        return data.data;
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    }
    setLoadingBalances(false);
    return { real_balance: 0, virtual_balance: 0 };
  };

  // Load balances on mount and wallet mode change
  useEffect(() => {
    if (user?.id) {
      loadUserBalances();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadUserBalances();
    }
  }, [walletMode, user?.id]);

  // Initialize game
  useEffect(() => {
    if (gameMode === 'local') {
      setGameStatus('playing');
      setIsMyTurn(true);
    }
  }, [gameMode]);

  // Timer effect: start/reset on isMyTurn
  useEffect(() => {
    if (gameStatus !== 'playing') {
      setTimer(60);
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      return;
    }
    if (isMyTurn) {
      setTimer(60);
      if (timerInterval.current) clearInterval(timerInterval.current);
      timerInterval.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            if (timerInterval.current) {
              clearInterval(timerInterval.current);
              timerInterval.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setTimer(60);
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    }
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    };
  }, [isMyTurn, gameStatus]);

  // Socket event handlers - following Diamond Hunt pattern
  useEffect(() => {
    const socket = getSocket();

    function onGameStart(data: { matchId: string; opponentId: string; yourTurn: boolean; stake: number; timeLimit: number; board?: any; color?: 'white' | 'black' }) {
      setCurrentMatchId(data.matchId);
      setOpponentId(data.opponentId);
      setIsMyTurn(data.yourTurn);
      setCurrentStake(data.stake);
      setGameStatus('playing');
      setShowBetModal(false);
      setIsInWaitingRoom(false);
      if (data.color) setPlayerColor(data.color);
      // Initialize chess board with server data or default
      if (data.board) {
        chessEngine.setBoard(data.board);
      } else {
        chessEngine.initializeGame();
      }
    }

    function onYourTurn(data: { matchId: string; move: any; gameType: string; board: any; opponentId: string; yourTurn?: boolean; currentTurnPlayerId?: string }) {
      if (data.matchId === currentMatchId) {
        if (typeof data.yourTurn === 'boolean') {
      setIsMyTurn(data.yourTurn);
        } else if (data.currentTurnPlayerId && user?.id) {
          setIsMyTurn(data.currentTurnPlayerId === user.id);
        } else {
          setIsMyTurn(true);
        }
        if (data.board) {
          chessEngine.setBoard(data.board);
        }
      }
    }

    function onMoveMade(data: { matchId: string; move: any; gameType: string; board: any; opponentId: string; currentTurnPlayerId?: string }) {
      if (data.matchId !== currentMatchId) return;
      
      if (data.board) {
        chessEngine.setBoard(data.board);
      }
      
      if (data.currentTurnPlayerId && user?.id) {
        setIsMyTurn(data.currentTurnPlayerId === user.id);
      } else if (data.opponentId !== user?.id) {
        setIsMyTurn(false);
      }
    }

    function onGameOver(data: { matchId: string; winner?: string; winnerId?: string; gameType: string; result: string; opponentId: string }) {
      if (data.matchId === currentMatchId) {
        setGameOver(true);
        setGameStatus('finished');
        setIsMyTurn(false);
        loadUserBalances();
        const winner = data.winner || data.winnerId;
        if (winner === user?.id) {
          setResultModalData({ isWin: true, isDraw: false });
        } else if (winner === 'draw') {
          setResultModalData({ isWin: false, isDraw: true });
            } else {
          setResultModalData({ isWin: false, isDraw: false });
        }
        setShowResultModal(true);
      }
    }

    function onError(data: any) {
      alert(`Error: ${data.message}`);
    }

    function onMatchEnded(data: { matchId: string; winner?: string; winnerId?: string }) {
      if (data.matchId !== currentMatchId) return;
      setGameOver(true);
      setGameStatus('finished');
      setIsMyTurn(false);
      const winner = data.winner || data.winnerId;
      if (user?.id === winner) {
        setResultModalData({ isWin: true, isDraw: false });
      } else if (winner === 'draw') {
        setResultModalData({ isWin: false, isDraw: true });
            } else {
        setResultModalData({ isWin: false, isDraw: false });
      }
      setShowResultModal(true);
    }

    if (socket) {
      socket.on('gameStart', onGameStart);
      socket.on('yourTurn', onYourTurn);
      socket.on('moveMade', onMoveMade);
      socket.on('gameOver', onGameOver);
      socket.on('error', onError);
      socket.on('matchEnded', onMatchEnded);
    }

    return () => {
      if (socket) {
        socket.off('gameStart', onGameStart);
        socket.off('yourTurn', onYourTurn);
        socket.off('moveMade', onMoveMade);
        socket.off('gameOver', onGameOver);
        socket.off('error', onError);
        socket.off('matchEnded', onMatchEnded);
      }
    };
  }, [currentMatchId, user?.id, chessEngine]);

  // Handle cell click
  const handleCellClick = useCallback((square: string) => {
    if (!isMyTurn || gameStatus !== 'playing') return;

    if (selectedSquare) {
      // Making a move
      if (legalMoves.includes(square)) {
        const piece = chessEngine.board[selectedSquare]?.piece;
        const promotion = piece && piece.type === 'pawn' && piece.color === 'white' && square[1] === '8' ? 'queen' : 
                         piece && piece.type === 'pawn' && piece.color === 'black' && square[1] === '1' ? 'queen' : undefined;
        
        if (gameMode === 'online' && socket && currentMatchId && piece) {
          setPendingMove({ from: selectedSquare, to: square });
          if (promotion) {
            setPromotionModal({ from: selectedSquare, to: square });
          } else {
            sendMove(currentMatchId, { from: selectedSquare, to: square });
          }
        } else if (piece) {
          // Local game
          chessEngine.makeMove(selectedSquare, square, piece, promotion);
        setIsMyTurn(false);
          setTimeout(() => {
            // Simple AI move for local game
            const aiMoves = chessEngine.getLegalMoves('black');
            if (aiMoves.length > 0) {
              const randomMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];
              chessEngine.makeMove(randomMove.from, randomMove.to, randomMove.piece);
              setIsMyTurn(true);
            }
          }, 1000);
        }
        
        setLastMove(`${selectedSquare}-${square}`);
        setSelectedSquare(null);
        setLegalMoves([]);
            } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    } else {
      // Selecting a piece
      const piece = chessEngine.board[square]?.piece;
      if (piece && piece.color === playerColor) {
        setSelectedSquare(square);
        const moves = chessEngine.getLegalMoves(piece.color)
          .filter(move => move.from === square)
          .map(move => move.to);
        setLegalMoves(moves);
      }
    }
  }, [isMyTurn, gameStatus, selectedSquare, legalMoves, chessEngine, playerColor, gameMode, socket, currentMatchId, chessEngine.makeMove, chessEngine.getLegalMoves]);

  // Check for game end conditions
  useEffect(() => {
    if (gameStatus !== 'playing') return;

    if (chessEngine.isCheckmate()) {
      // The player who just moved is the winner
      let winner = null;
      if (isMyTurn) {
        winner = opponentId;
      } else {
        winner = user?.id;
      }
      if (winner && typeof winner === 'string' && winner !== '') {
        setGameResult({ winner, reason: 'checkmate' });
        setGameStatus('finished');
        if (socket && currentMatchId) {
          socket.emit('gameEnd', {
            matchId: currentMatchId,
            winner,
            gameType: 'chess',
            result: 'checkmate',
            opponentId
          });
        }
      } else {
        console.error('No valid winner ID found for payout! user?.id:', user?.id, 'opponentId:', opponentId);
      }
    } else if (chessEngine.isStalemate() || chessEngine.isDraw()) {
      setGameResult({ winner: 'draw', reason: chessEngine.isStalemate() ? 'stalemate' : 'draw' });
      setGameStatus('finished');
      if (socket && currentMatchId) {
        socket.emit('gameEnd', {
          matchId: currentMatchId,
          winner: 'draw',
          gameType: 'chess',
          result: chessEngine.isStalemate() ? 'stalemate' : 'draw',
          opponentId
        });
      }
    }
  }, [gameStatus, chessEngine.isCheckmate, chessEngine.isStalemate, chessEngine.isDraw, isMyTurn, opponentId, user?.id, socket, currentMatchId]);

  // Handle play game (1v1 matchmaking)
  const handlePlayGame = async () => {
    const freshBalances = await loadUserBalances();
    if (freshBalances) {
      setShowBetModal(true);
    } else {
      alert('Failed to load wallet balances. Please try again.');
    }
  };

  // Handle practice mode
  const handlePracticeMode = () => {
    setIsPracticeMode(true);
    setGameStatus('playing');
    setIsMyTurn(true);
    chessEngine.resetGame();
  };

  // Handle waiting room cancel
  const handleWaitingRoomCancel = () => {
      const socket = getSocket();
      if (socket) {
      socket.emit('cancelQueue');
    }
    setGameStatus('menu');
    setIsInWaitingRoom(false);
  };

  const handleBetConfirmed = (stakeAmount: number) => {
    setCurrentStake(stakeAmount);
    setGameStatus('waiting');
    setIsInWaitingRoom(true);
    setShowBetModal(false);
    
    const socket = getSocket();
    const isConnected = socket && socket.connected;
    console.log('🔍 Socket connected before joinQueue:', isConnected);
    
    if (socket && socket.connected) {
      socket.emit('joinQueue', {
        gameId: getGameId('chess'),
        walletMode,
        stake: stakeAmount
      });
      console.log('✅ Sent joinQueue', { gameId: getGameId('chess'), walletMode, stake: stakeAmount });
    } else {
      console.error('❌ Socket not connected, cannot join queue');
      alert('Connection error. Please refresh the page and try again.');
      setGameStatus('menu');
    }
  };

  // Handle result modal close
  const handleResultModalClose = () => {
    setShowResultModal(false);
    setGameStatus('menu');
    setCurrentMatchId(null);
    setOpponentId(null);
    setIsInWaitingRoom(false);
    setGameResult(null);
    setIsPracticeMode(false);
    chessEngine.resetGame();
  };

  if (showBetModal && user) {
    return (
      <GameBetModal
        open={showBetModal}
        onClose={() => setShowBetModal(false)}
        gameType="chess"
        userId={user.id}
        username={user.username}
        onConfirm={() => {}}
        onBetConfirmed={handleBetConfirmed}
        userBalances={userBalances}
      />
    );
  }

  if (gameStatus === 'waiting') {
    return (
      <MatchmakingWaitingRoom
        gameType="chess"
        stakeAmount={currentStake}
        onMatchFound={() => {}}
        onCancel={handleWaitingRoomCancel}
      />
    );
  }

  if (showResultModal) {
    return (
      <GameResultModal
        isOpen={showResultModal}
        onClose={handleResultModalClose}
        isWin={resultModalData.isWin}
        isDraw={resultModalData.isDraw}
        gameType="chess"
      />
    );
  }

  if (gameStatus === 'menu') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-card-gradient rounded-xl p-6 border border-gray-700">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center">
              <Crown className="h-8 w-8 mr-3 text-gaming-accent" />
              Chess
            </h2>
            <p className="text-gray-300 text-lg mb-6">
              Classic strategic chess with a futuristic twist. Checkmate your opponent to claim victory!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card-mobile text-center">
              <DollarSign className="h-12 w-12 text-gaming-gold mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Play 1v1 for {walletMode === 'real' ? 'Money' : 'Virtual Coins'}</h3>
              <p className="text-gray-400 mb-4 text-sm">Challenge other players and bet {walletMode === 'real' ? 'real money' : 'virtual coins'}. Winner takes 90% of the pot!</p>
              <button
                onClick={handlePlayGame}
                disabled={loadingBalances}
                className="w-full btn-mobile bg-gradient-to-r from-emerald-400 to-blue-400 hover:opacity-90 text-white relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                {loadingBalances ? 'Loading...' : `Play 1v1 (${walletMode === 'real' ? 'Real Money' : 'Virtual Coins'})`}
              </button>
            </div>

            <div className="card-mobile text-center">
              <Trophy className="h-12 w-12 text-gaming-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Practice Mode</h3>
              <p className="text-gray-400 mb-4 text-sm">Play against computer AI to practice your skills without betting.</p>
              <button
                onClick={handlePracticeMode}
                className="w-full btn-mobile bg-gradient-to-r from-red-300 to-yellow-200 hover:from-red-200 hover:to-yellow-100 text-gray-800 font-semibold relative overflow-hidden group hover:-translate-y-1 transition-all duration-300"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-400/5 via-orange-400/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                
                <div className="absolute inset-0 bg-gradient-to-r from-red-400/10 via-orange-400/10 to-yellow-400/10 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg blur-sm scale-110 group-hover:scale-125"></div>
                
                <div className="absolute inset-1 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md"></div>
                
                <div className="relative z-10 group-hover:scale-105 transition-all duration-300">
                Practice vs Computer
                </div>
                
                <div className="absolute -bottom-1 left-1 right-1 h-1 bg-black/20 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gaming-dark rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">How to Play</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">1. Strategic Gameplay</h4>
                <p>Use different pieces with unique movement patterns to outmaneuver your opponent.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">2. Take Turns</h4>
                <p>Players take turns moving pieces, 1 minute per move maximum.</p>
              </div>
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">3. Win the Game</h4>
                <p>Checkmate your opponent's king or force a stalemate to win!</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
              <p className="text-sm text-red-300">
                <strong>⚠️ Important:</strong> Each move must be completed within 1 minute.
              </p>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (gameStatus === 'playing') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-2 sm:p-4">
          <div className="max-w-6xl mx-auto">
            {/* Game Header */}
            <div className="flex flex-col lg:flex-row items-center justify-between mb-6 space-y-4 lg:space-y-0 px-2 sm:px-0">
                  <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white">Chess</h1>
                    <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 rounded-full font-semibold text-white" 
                        style={{ 
                          background: playerColor === 'white' ? '#f0d9b5' : '#b58863',
                          color: playerColor === 'white' ? '#333' : '#fff'
                        }}>
                    You are {playerColor === 'white' ? 'White' : 'Black'}
                  </span>
                  <span className="px-3 py-1 rounded-full font-semibold text-white bg-gray-700">
                    {isMyTurn ? 'Your turn' : 'Waiting for opponent...'}
                  </span>
                </div>
                </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  <span className="text-white font-semibold">
                    ${currentStake}
                        </span>
                    </div>
              </div>
            </div>

            {/* Game Board */}
            <div className="flex flex-col items-center w-full">
              <div className="w-full max-w-[98vw] sm:max-w-[480px] mx-auto">
                <ChessBoard
                  board={chessEngine.board}
                  onCellClick={handleCellClick}
                  selectedSquare={selectedSquare}
                  legalMoves={legalMoves}
                  lastMove={lastMove}
                  isMyTurn={isMyTurn}
                  playerColor={playerColor}
                />
              </div>

              {/* Info Panel Below Board */}
              <div className="w-full max-w-[98vw] sm:max-w-[480px] mx-auto mt-4 bg-gaming-dark rounded-xl border border-gray-700 p-4 flex flex-col gap-2 text-sm text-gray-200 shadow-lg">
                <div className="flex flex-wrap gap-2 justify-between items-center mb-2">
                  <button onClick={handlePracticeMode} className="btn-mobile-sm bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs">New Game</button>
                  <button onClick={handleResultModalClose} className="btn-mobile-sm bg-red-700 hover:bg-red-800 text-white">Surrender</button>
                  <span className="px-2 py-1 rounded bg-gray-800 text-xs">Mode: {gameMode === 'online' ? '1v1 Match' : 'Practice'}</span>
                  <span className="px-2 py-1 rounded bg-gray-800 text-xs">Status: {gameStatus}</span>
                  <span className="px-2 py-1 rounded bg-gray-800 text-xs">Time Left: <span className={isMyTurn ? 'text-yellow-400 font-bold' : 'text-gray-400'}>{isMyTurn ? timer : '--'}</span></span>
                </div>
                <div className="flex flex-wrap gap-2 justify-between items-center">
                  <span className="px-2 py-1 rounded bg-gray-800 text-xs">Current Turn: {isMyTurn ? 'You' : 'Opponent'}</span>
                  <span className="px-2 py-1 rounded bg-gray-800 text-xs">Win Condition: Checkmate</span>
                  <span className="px-2 py-1 rounded bg-gray-800 text-xs">Board Size: 8x8</span>
                  <span className="px-2 py-1 rounded bg-gray-800 text-xs">Stake: {currentStake} ({walletMode})</span>
                  <span className="px-2 py-1 rounded bg-gray-800 text-xs">Balances: Real: {userBalances.real_balance} | Virtual: {userBalances.virtual_balance}</span>
                  <span className="px-2 py-1 rounded bg-gray-800 text-xs">Match ID: {currentMatchId || '--'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <MatchChat
          matchId={matchId || ''}
          currentUserId={user?.id || ''}
          currentUsername={user?.username || ''}
          opponentName={opponent || ''}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen((v) => !v)}
        />
        <AnimatePresence>
  {promotionModal && (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="bg-gaming-dark/90 rounded-xl p-6 shadow-2xl border border-blue-500 flex flex-col items-center">
        <h2 className="text-lg font-bold text-white mb-4">Promote Pawn</h2>
        <div className="flex space-x-4">
          {['q','r','b','n'].map(piece => (
            <button key={piece} onClick={() => handlePromotionSelect(piece)} className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-lg hover:scale-110 transition-transform text-2xl">
              {piece === 'q' ? '♛' : piece === 'r' ? '♜' : piece === 'b' ? '♝' : '♞'}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
      </>
    );
  }

  return null;
} 