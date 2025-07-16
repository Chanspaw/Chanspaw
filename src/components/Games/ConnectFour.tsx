// import React from 'react';
import { useState, useEffect } from 'react';
import { Circle, User, Clock, Users, DollarSign, Info } from 'lucide-react';
import { GameBetModal } from './GameBetModal';
import { GameResultModal } from './GameResultModal';
import { useAuth } from '../../contexts/AuthContext';
import { useWalletMode } from '../../contexts/WalletModeContext';
import { MatchmakingWaitingRoom } from './MatchmakingWaitingRoom';
import { getSocket, testSocket } from '../../utils/socket';
import { GameControls } from '../UI/GameControls';
import { getGameId } from '../../utils/gameId';
import { MatchChat } from './MatchChat';

interface ConnectFourProps {
  matchId?: string;
}

export function ConnectFour({ matchId }: ConnectFourProps) {
  const { user } = useAuth();
  const { walletMode } = useWalletMode();
  const [board, setBoard] = useState<number[][]>(
    Array(6).fill(null).map(() => Array(7).fill(0))
  );
  const [currentPlayer, setCurrentPlayer] = useState<'player' | 'opponent'>('player');
  const [gameOver, setGameOver] = useState(false);
  const [gameStatus, setGameStatus] = useState<'menu' | 'waiting' | 'playing' | 'finished'>('menu');
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(matchId || null);
  const [currentStake, setCurrentStake] = useState(0);
  const [showBetModal, setShowBetModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState<{ isWin: boolean; isDraw: boolean }>({ isWin: false, isDraw: false });
  const [userBalances, setUserBalances] = useState<{ real_balance: number; virtual_balance: number }>({ real_balance: 0, virtual_balance: 0 });
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [computerShouldMove, setComputerShouldMove] = useState(false);
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [turnTimer, setTurnTimer] = useState(30);
  const [resultModalShown, setResultModalShown] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [rules, setRules] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Listen for matchFound event
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    const onMatchFound = (data: any) => {
      setCurrentMatchId(data.matchId);
      setGameStatus('playing');
      setShowBetModal(false);
      initializeGame();
    };
    
    socket.on('matchFound', onMatchFound);
    return () => {
      socket.off('matchFound', onMatchFound);
    };
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadUserBalances();
    }
  }, [user?.id]);

  // Reload balances when wallet mode changes
  useEffect(() => {
    if (user?.id) {
      loadUserBalances();
    }
  }, [walletMode, user?.id]);

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
        setLoadingBalances(false);
        return data.data;
      }
    } catch (error) {
      setLoadingBalances(false);
    }
    setLoadingBalances(false);
    return { real_balance: 0, virtual_balance: 0 };
  };

  const handlePlayGame = async () => {
    console.log('🎮 Starting game, current balances:', userBalances);
    console.log('🎮 Current wallet mode:', walletMode);
    
    // Load fresh balances before showing modal
    const freshBalances = await loadUserBalances();
    console.log('🎮 Fresh balances loaded:', freshBalances);
    
    // Only show modal if balances loaded successfully
    if (freshBalances) {
      setShowBetModal(true);
    } else {
      alert('Failed to load wallet balances. Please try again.');
    }
  };

  const handleBetConfirmed = (stakeAmount: number) => {
    setCurrentStake(stakeAmount);
    setGameStatus('waiting');
    setIsInWaitingRoom(true);
    setShowBetModal(false);
    
    // Test socket connection first
    const isConnected = testSocket();
    console.log('🔍 Socket connected before joinQueue:', isConnected);
    
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('joinQueue', {
        stake: stakeAmount,
        walletMode,
        gameId: getGameId('connect-four'),
      });
      console.log('✅ Sent joinQueue', { stake: stakeAmount, walletMode, gameId: getGameId('connect-four') });
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
    setCurrentStake(0);
  };

  const handlePracticeMode = () => {
    setIsPracticeMode(true);
    setGameStatus('waiting');
    setTimeout(() => {
      setGameStatus('playing');
      initializeGame();
    }, 2000);
  };

  const initializeGame = () => {
    const newBoard = Array(6).fill(null).map(() => Array(7).fill(0));
    setBoard(newBoard);
    setCurrentPlayer('player');
    setGameOver(false);
  };

  useEffect(() => {
    if (gameStatus === 'waiting' && isPracticeMode) {
      const timer = setTimeout(() => {
        setGameStatus('playing');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, isPracticeMode]);

  // Computer opponent logic for practice mode
  useEffect(() => {
    if (gameStatus === 'playing' && 
        isPracticeMode && 
        currentPlayer === 'opponent' && 
        !gameOver && 
        turnTimer > 0) {
      
      const computerTimer = setTimeout(() => {
        if (!gameOver && currentPlayer === 'opponent') {
          makeComputerMove();
        }
      }, 1000 + Math.random() * 2000); // Computer thinks for 1-3 seconds

      return () => clearTimeout(computerTimer);
    }
  }, [gameStatus, isPracticeMode, currentPlayer, gameOver, turnTimer]);

  // Computer move trigger
  useEffect(() => {
    if (computerShouldMove && isPracticeMode && !gameOver) {
      setComputerShouldMove(false);
      
      setTimeout(() => {
        if (!gameOver) {
          makeComputerMove();
        }
      }, 1000 + Math.random() * 1000);
    }
  }, [computerShouldMove, isPracticeMode, gameOver]);

  // Minimax algorithm for Connect Four (depth-limited for performance)
  function minimax(board: number[][], depth: number, maximizingPlayer: boolean): { score: number; col?: number } {
    const validMoves = getValidMoves();
    const winner = getBoardWinner(board);
    if (winner === 2) return { score: 1000 - depth };
    if (winner === 1) return { score: -1000 + depth };
    if (checkDraw(board) || depth === 0) return { score: 0 };

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      let bestCol = validMoves[0];
      for (const col of validMoves) {
        const tempBoard = board.map((r: number[]) => [...r]);
        for (let row = 5; row >= 0; row--) {
          if (tempBoard[row][col] === 0) {
            tempBoard[row][col] = 2;
            break;
          }
        }
        const evalResult = minimax(tempBoard, depth - 1, false).score;
        if (evalResult > maxEval) {
          maxEval = evalResult;
          bestCol = col;
        }
      }
      return { score: maxEval, col: bestCol };
    } else {
      let minEval = Infinity;
      let bestCol = validMoves[0];
      for (const col of validMoves) {
        const tempBoard = board.map((r: number[]) => [...r]);
        for (let row = 5; row >= 0; row--) {
          if (tempBoard[row][col] === 0) {
            tempBoard[row][col] = 1;
            break;
          }
        }
        const evalResult = minimax(tempBoard, depth - 1, true).score;
        if (evalResult < minEval) {
          minEval = evalResult;
          bestCol = col;
        }
      }
      return { score: minEval, col: bestCol };
    }
  }

  // Helper to check winner for minimax
  function getBoardWinner(board: number[][]): number | null {
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        if (board[row][col] === 0) continue;
        if (checkWinner(board, row, col, board[row][col])) {
          return board[row][col];
        }
      }
    }
    return null;
  }

  // Replace makeComputerMove with minimax AI
  const makeComputerMove = () => {
    if (gameOver) return;
    // Use depth 4 for performance (can increase for more difficulty)
    const { col } = minimax(board, 4, true);
    if (col === undefined) return;
    for (let row = 5; row >= 0; row--) {
      if (board[row][col] === 0) {
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = 2;
        setBoard(newBoard);
        if (checkWinner(newBoard, row, col, 2)) {
          setGameOver(true);
          setTimeout(() => {
            showGameResult('opponent');
          }, 1000);
          return;
        }
        if (checkDraw(newBoard)) {
          setGameOver(true);
          setTimeout(() => {
            showGameResult('draw');
          }, 1000);
          return;
        }
        setCurrentPlayer('player');
        setTurnTimer(30);
        return;
      }
    }
  };

  const getValidMoves = () => {
    const validMoves: number[] = [];
    for (let col = 0; col < 7; col++) {
      if (board[0][col] === 0) {
        validMoves.push(col);
      }
    }
    return validMoves;
  };

  const checkWinner = (board: number[][], row: number, col: number, player: number) => {
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];

    for (let [dx, dy] of directions) {
      let count = 1;
      
      // Check positive direction
      let r = row + dx;
      let c = col + dy;
      while (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
        count++;
        r += dx;
        c += dy;
      }
      
      // Check negative direction
      r = row - dx;
      c = col - dy;
      while (r >= 0 && r < 6 && c >= 0 && c < 7 && board[r][c] === player) {
        count++;
        r -= dx;
        c -= dy;
      }
      
      if (count >= 4) return true;
    }
    return false;
  };

  const checkDraw = (board: number[][]) => {
    return board[0].every(cell => cell !== 0);
  };

  const dropPiece = (col: number) => {
    if (gameOver || board[0][col] !== 0 || gameStatus !== 'playing') return;
    if (!isPracticeMode) {
      if (!isMyTurn) return;
      const socket = getSocket();
      if (socket && currentMatchId) {
        socket.emit('makeMove', {
          matchId: currentMatchId,
          move: { column: col },
          gameType: 'connect_four'
        });
      } else {
        alert('Connection error. Please refresh the page.');
      }
      return;
    }
    // Practice mode: update locally
    const newBoard = [...board];
    for (let row = 5; row >= 0; row--) {
      if (newBoard[row][col] === 0) {
        newBoard[row][col] = 1;
        setBoard(newBoard);
        // Check for win/draw
        if (checkWinner(newBoard, row, col, 1)) {
          setGameOver(true);
          setTimeout(() => {
            showGameResult('player');
          }, 1000);
          return;
        }
        if (checkDraw(newBoard)) {
          setGameOver(true);
          setTimeout(() => {
            showGameResult('draw');
          }, 1000);
          return;
        }
        // Switch to computer's turn
        setCurrentPlayer('opponent');
        setTimeout(() => {
          makeComputerMove();
        }, 600);
        break;
      }
    }
  };

  const resetGame = () => {
    setBoard(Array(6).fill(null).map(() => Array(7).fill(0)));
    setCurrentPlayer('player');
    setGameOver(false);
    setGameStatus('menu');
    setCurrentMatchId(null);
    setIsPracticeMode(false);
    setComputerShouldMove(false);
    setShowResultModal(false);
    setIsMyTurn(false);
    setOpponentId(null);
    setTurnTimer(30);
    setResultModalShown(false);
  };

  const showGameResult = (winner: string) => {
    const isPlayerWin = winner === 'player';
    const isDraw = winner === 'draw';
    setResultModalData({
      isWin: isPlayerWin,
      isDraw: isDraw
    });
    setShowResultModal(true);
  };

  const handleResultModalClose = () => {
    setShowResultModal(false);
    resetGame();
  };

  const handleOpponentMove = (move: { column: number }) => {
    const { column } = move;
    console.log('📥 Processing opponent move in column:', column);
    
    // Apply opponent's move to the board
    const newBoard = [...board];
    for (let row = 5; row >= 0; row--) {
      if (newBoard[row][column] === 0) {
        newBoard[row][column] = 2; // Opponent's piece
        break;
      }
    }
    setBoard(newBoard);
    
    // Check if opponent won
    for (let row = 5; row >= 0; row--) {
      if (newBoard[row][column] === 2) {
        if (checkWinner(newBoard, row, column, 2)) {
          handleGameEnd(opponentId || '', 'opponent_won');
          return;
        }
        break;
      }
    }
    
    // Check for draw
    if (checkDraw(newBoard)) {
      handleGameEnd('draw', 'draw');
    }
  };

  const handleGameEnd = (winnerId: string, result: string) => {
    setGameOver(true);
    setGameStatus('finished');
    setIsMyTurn(false);
    
    // Send game end to server
    const socket = getSocket();
    if (socket && currentMatchId) {
      socket.emit('gameEnd', {
        matchId: currentMatchId,
        winner: winnerId,
        gameType: 'connect_four',
        result,
        opponentId
      });
    }
    
    // Show result modal
    if (winnerId === user?.id) {
      setResultModalData({ isWin: true, isDraw: false });
    } else if (winnerId === 'draw') {
      setResultModalData({ isWin: false, isDraw: true });
    } else {
      setResultModalData({ isWin: false, isDraw: false });
    }
    setShowResultModal(true);
  };

  // Listen for gameStart event
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onGameStart(data: { matchId: string; opponentId: string; yourTurn: boolean; gameId: string; stake: number; walletMode: string; timeLimit: number; diamondPosition?: any }) {
      setCurrentMatchId(data.matchId);
      setOpponentId(data.opponentId);
      setIsMyTurn(!!data.yourTurn);
      setCurrentStake(data.stake);
      setGameStatus('playing');
      setShowBetModal(false);
      setIsInWaitingRoom(false);
      setTurnTimer(data.timeLimit);
      setResultModalShown(false);
      initializeGame();
    }

    // Listen for standardized yourTurn event
    function onYourTurn(data: { matchId: string; yourTurn?: boolean; move: any; gameType: string; board: any; opponentId: string; currentTurn?: string; currentTurnPlayerId?: string }) {
      if (data.matchId === currentMatchId && data.yourTurn && user?.id === data.currentTurnPlayerId) {
        setIsMyTurn(true);
        setTurnTimer(30);
        setGameStatus('playing');
        if (data.board) setBoard(data.board);
      } else {
        setIsMyTurn(false);
        setTurnTimer(0);
      }
    }

    // Listen for standardized moveMade event
    function onMoveMade(data: { matchId: string; move: any; gameType: string; board: any; opponentId: string; currentTurnPlayerId?: string }) {
      if (data.matchId !== currentMatchId) return;
      // Update board
      if (data.board) setBoard(data.board);
      // Set isMyTurn based on currentTurnPlayerId
      if (data.currentTurnPlayerId && user?.id === data.currentTurnPlayerId) {
        setIsMyTurn(true);
        setTurnTimer(30);
      } else {
        setIsMyTurn(false);
        setTurnTimer(0);
      }
    }

    function onGameOver(data: { 
      matchId: string; 
      winner?: string; 
      winnerId?: string; 
      gameType: string; 
      result: string; 
      opponentId: string 
    }) {
      if (data.matchId === currentMatchId && !resultModalShown) {
        setGameOver(true);
        setGameStatus('finished');
        setIsMyTurn(false);
        loadUserBalances();
        // Handle both winner and winnerId fields
        const winner = data.winner || data.winnerId;
        if (winner === user?.id) {
          setResultModalData({ isWin: true, isDraw: false });
        } else if (winner === 'draw') {
          setResultModalData({ isWin: false, isDraw: true });
        } else {
          setResultModalData({ isWin: false, isDraw: false });
        }
        setShowResultModal(true);
        setResultModalShown(true);
      }
    }

    function onError(data: { message: string }) {
      alert(`Error: ${data.message}`);
    }

    function onMatchEnded(data: { matchId: string; winner?: string; winnerId?: string }) {
      if (data.matchId === currentMatchId && !resultModalShown) {
        setGameOver(true);
        setGameStatus('finished');
        setIsMyTurn(false);
        loadUserBalances();
        // Handle both winner and winnerId fields
        const winner = data.winner || data.winnerId;
        if (winner === user?.id) {
          setResultModalData({ isWin: true, isDraw: false });
        } else if (winner === 'draw') {
          setResultModalData({ isWin: false, isDraw: true });
        } else {
          setResultModalData({ isWin: false, isDraw: false });
        }
        setShowResultModal(true);
        setResultModalShown(true);
      }
    }

    socket.on('gameStart', onGameStart);
    socket.on('yourTurn', onYourTurn);
    socket.on('moveMade', onMoveMade);
    socket.on('gameOver', onGameOver);
    socket.on('error', onError);
    socket.on('matchEnded', onMatchEnded);

    return () => {
      socket.off('gameStart', onGameStart);
      socket.off('yourTurn', onYourTurn);
      socket.off('moveMade', onMoveMade);
      socket.off('gameOver', onGameOver);
      socket.off('error', onError);
      socket.off('matchEnded', onMatchEnded);
    };
  }, [currentMatchId, user?.id]);

  // Turn timer effect
  useEffect(() => {
    console.log('⏰ ConnectFour Timer effect:', { gameStatus, isMyTurn, gameOver, turnTimer });
    
    // STOP TIMER IMMEDIATELY IF GAME IS OVER
    if (gameOver || gameStatus !== 'playing') {
      console.log('⏰ ConnectFour Timer stopped: Game over or not playing');
      return;
    }
    
    if (gameStatus === 'playing' && isMyTurn && !gameOver && turnTimer > 0) {
      console.log('⏰ ConnectFour Starting timer countdown');
      const timer = setInterval(() => {
        setTurnTimer(prev => {
          if (prev <= 1) {
            console.log('⏰ ConnectFour Timer finished');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        console.log('⏰ ConnectFour Clearing timer');
        clearInterval(timer);
      };
    }
  }, [gameStatus, isMyTurn, gameOver]); // REMOVED turnTimer FROM DEPENDENCIES

  // Add this function before the return statement
  function handleSurrender() {
    if (gameOver || gameStatus !== 'playing') return;
    setGameOver(true);
    setGameStatus('finished');
    setShowResultModal(true);
    setResultModalData({ isWin: false, isDraw: false });
  }

  useEffect(() => {
    if (showRules) {
      fetch('/api/game-rules/connect_four')
        .then(res => res.json())
        .then(data => setRules(data.rules_en || 'No rules found.'));
    }
  }, [showRules]);

  // In the result modal and post-game UI, if resultModalData.isDraw is true, show 'Draw! Both players have been refunded their stake.' and reloadUserBalances().
  useEffect(() => {
    if (showResultModal && resultModalData.isDraw) {
      loadUserBalances();
    }
  }, [showResultModal, resultModalData.isDraw]);

  // Main menu screen
  if (gameStatus === 'menu') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-card-gradient rounded-xl p-6 border border-gray-700">
          <div className="text-center mb-8">
            <Circle className="h-16 w-16 text-gaming-accent mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Connect Four</h1>
            <p className="text-gray-400">Classic strategy game - connect 4 pieces to win!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-mobile text-center">
              <DollarSign className="h-12 w-12 text-gaming-gold mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Play 1v1 for Money</h3>
              <p className="text-gray-400 mb-4 text-sm">Challenge other players and bet real money. Winner takes 90% of the pot!</p>
              <button
                onClick={handlePlayGame}
                disabled={loadingBalances}
                className="w-full btn-mobile bg-gradient-to-r from-emerald-400 to-blue-400 text-white hover:opacity-90 transform duration-200 rounded text-xs relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                {loadingBalances ? 'Loading...' : 'Play 1v1 (Virtual Coins)'}
              </button>
            </div>

            <div className="card-mobile text-center">
              <Users className="h-12 w-12 text-gaming-accent mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Practice Mode</h3>
              <p className="text-gray-400 mb-4 text-sm">Play against AI or practice your skills without betting.</p>
              <button
                onClick={handlePracticeMode}
                className="w-full btn-mobile bg-gradient-to-r from-red-300 to-yellow-200 hover:from-red-200 hover:to-yellow-100 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-all duration-200"
              >
                Practice
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gaming-dark rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">How to Play</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">1. Drop Pieces</h4>
                <p>Click on any column to drop your piece</p>
              </div>
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">2. Connect Four</h4>
                <p>Get 4 pieces in a row (horizontal, vertical, or diagonal)</p>
              </div>
              <div>
                <h4 className="font-semibold text-gaming-accent mb-1">3. Win the Pot</h4>
                <p>Winner takes 90% of the total bet, platform keeps 10%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Game Bet Modal */}
        {showBetModal && user && (
          <GameBetModal
            open={showBetModal}
            onClose={() => setShowBetModal(false)}
            onConfirm={handleBetConfirmed}
            gameType="connect_four"
            userId={user?.id || ''}
            username={user?.username || ''}
            onBetConfirmed={handleBetConfirmed}
            userBalances={userBalances}
          />
        )}
      </div>
    );
  }

  if (gameStatus === 'waiting' && !isPracticeMode) {
    return (
      <MatchmakingWaitingRoom
        gameType="connect_four"
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
  if (gameStatus === 'waiting' && isPracticeMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
        <div className="animate-spin mb-4 h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full"></div>
        <div className="text-lg text-white font-semibold">Computer is joining...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-card-gradient rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Circle className="h-6 w-6 mr-2 text-gaming-accent" />
            Connect Four
            {isPracticeMode && <span className="ml-2 text-sm text-gaming-accent">Practice Mode</span>}
            {currentMatchId && (
              <span className="ml-2 text-sm text-gaming-gold">Match #{currentMatchId.slice(-8)}</span>
            )}
          </h2>
          <div className="flex items-center space-x-4">
            {isMyTurn && gameStatus === 'playing' && (
              <div className="flex items-center space-x-2 bg-gaming-dark px-3 py-2 rounded-lg">
                <Clock className="h-4 w-4 text-gaming-gold" />
                <span className="text-white font-semibold">{turnTimer}s</span>
              </div>
            )}
            <button
              className="p-2 rounded-full bg-gray-800 hover:bg-blue-500 transition-colors"
              title="Regleman Jwèt la"
              onClick={() => setShowRules(true)}
            >
              <Info className="h-6 w-6 text-white" />
            </button>
          </div>
        </div>
        {/* Turn Banner */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-gaming-dark text-white font-bold shadow border border-gray-700">
            {isPracticeMode
              ? (currentPlayer === 'player' ? (
                  <User className="h-5 w-5 text-blue-400 mr-2" />
                ) : (
                  <Users className="h-5 w-5 text-red-400 mr-2" />
                ))
              : (isMyTurn ? (
                  <User className="h-5 w-5 text-blue-400 mr-2" />
                ) : (
                  <Users className="h-5 w-5 text-red-400 mr-2" />
                ))}
            <span className="text-lg">
              {isPracticeMode
                ? (currentPlayer === 'player' ? 'Your Turn' : 'Computer Turn')
                : (isMyTurn ? 'Your Turn' : 'Opponent Turn')}
            </span>
          </div>
        </div>
        {/* Board FIRST */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="lg:col-span-3 flex flex-col items-center justify-center min-h-[480px] py-8">
            <div className="relative w-full max-w-2xl mx-auto p-4 rounded-3xl bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 border border-gray-700 shadow-2xl">
              {/* Waiting overlay */}
              {!isPracticeMode && !isMyTurn && gameStatus === 'playing' && !gameOver && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-20 rounded-3xl">
                  <Users className="h-10 w-10 text-red-400 mb-4 animate-bounce" />
                  <span className="text-white text-xl font-bold">Waiting for opponent...</span>
                </div>
              )}
              {/* Column headers for dropping pieces */}
              <div className="grid grid-cols-7 gap-1 mb-1 w-full">
                {Array.from({ length: 7 }, (_, col) => (
                  <button
                    key={col}
                    onClick={() => dropPiece(col)}
                    disabled={gameOver || (isPracticeMode ? currentPlayer !== 'player' : !isMyTurn) || board[0][col] !== 0}
                    className="aspect-square w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gray-700 hover:bg-gray-600 focus:bg-gray-800 transition-colors duration-150 flex items-center justify-center shadow-inner ring-0 hover:ring-4 hover:ring-gray-400/40"
                    style={{ boxShadow: 'inset 0 2px 8px 0 #111827, 0 1.5px 0 0 #374151' }}
                  >
                    <span className="text-yellow-400 text-lg md:text-xl">▼</span>
                  </button>
                ))}
              </div>
              {/* Game board */}
              <div className="grid grid-cols-7 gap-1 w-full bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 p-2 rounded-2xl shadow-inner">
                {board.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="aspect-square w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 border-gray-900 bg-gray-900 shadow-[inset_0_2px_8px_0_#111827]"
                    >
                      {cell === 1 && (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg border-2 border-blue-300 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">P</span>
                        </div>
                      )}
                      {cell === 2 && (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg border-2 border-red-300 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">O</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        {/* GameControls and info BELOW board */}
        <GameControls
          onNewGame={resetGame}
          onSurrender={handleSurrender}
          mode={isPracticeMode ? 'Practice' : '1v1 Match'}
          status={gameStatus}
          timeLeft={turnTimer}
          currentTurn={isPracticeMode ? (currentPlayer === 'player' ? 'You' : 'Computer') : (isMyTurn ? 'You' : 'Opponent')}
          winCondition={"Connect 4 in a row"}
          boardSize={"6x7"}
          symbols={"🔵🔴"}
          stake={currentStake}
          walletMode={walletMode}
          showBalances={true}
          realBalance={userBalances.real_balance}
          virtualBalance={userBalances.virtual_balance}
        />
      </div>

      {/* Game Result Modal */}
      {showResultModal && (
        <GameResultModal
          isOpen={showResultModal}
          isWin={resultModalData.isWin}
          isDraw={resultModalData.isDraw}
          refundMessage={resultModalData.isDraw ? 'Draw! Both players have been refunded their stake.' : undefined}
          onClose={handleResultModalClose}
          gameType="connect_four"
        />
      )}

      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full shadow-2xl border border-blue-500 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-red-400 text-xl"
              onClick={() => setShowRules(false)}
              aria-label="Fèmen"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-blue-400 mb-4 flex items-center"><Info className="h-6 w-6 mr-2" />Game Rules</h2>
            <pre className="text-gray-200 whitespace-pre-wrap text-base">{rules}</pre>
          </div>
        </div>
      )}

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