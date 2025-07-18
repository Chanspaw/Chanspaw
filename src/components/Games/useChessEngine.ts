import { useState, useCallback } from 'react';
import { Chess as ChessJS } from 'chess.js';

interface ChessPiece {
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
  color: 'white' | 'black';
  hasMoved?: boolean;
}

interface BoardCell {
  piece: ChessPiece | null;
  position: string;
}

interface Move {
  from: string;
  to: string;
  piece: ChessPiece;
  promotion?: string;
}

interface GameState {
  board: { [key: string]: BoardCell };
  currentPlayer: 'white' | 'black';
  whiteKingPosition: string;
  blackKingPosition: string;
  whiteRooksMoved: { [key: string]: boolean };
  blackRooksMoved: { [key: string]: boolean };
  kingsMoved: { white: boolean; black: boolean };
  enPassantTarget: string | null;
  moveCount: number;
}

// Define createInitialGameState function before using it in useState
const createInitialGameState = (): GameState => {
  const board: { [key: string]: BoardCell } = {};
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Initialize empty board
  files.forEach(file => {
    ranks.forEach(rank => {
      const square = `${file}${rank}`;
      board[square] = { piece: null, position: square };
    });
  });

  // Set up white pieces
  board['a1'] = { piece: { type: 'rook', color: 'white', hasMoved: false }, position: 'a1' };
  board['b1'] = { piece: { type: 'knight', color: 'white' }, position: 'b1' };
  board['c1'] = { piece: { type: 'bishop', color: 'white' }, position: 'c1' };
  board['d1'] = { piece: { type: 'queen', color: 'white' }, position: 'd1' };
  board['e1'] = { piece: { type: 'king', color: 'white', hasMoved: false }, position: 'e1' };
  board['f1'] = { piece: { type: 'bishop', color: 'white' }, position: 'f1' };
  board['g1'] = { piece: { type: 'knight', color: 'white' }, position: 'g1' };
  board['h1'] = { piece: { type: 'rook', color: 'white', hasMoved: false }, position: 'h1' };

  // Set up white pawns
  files.forEach(file => {
    board[`${file}2`] = { piece: { type: 'pawn', color: 'white', hasMoved: false }, position: `${file}2` };
  });

  // Set up black pieces
  board['a8'] = { piece: { type: 'rook', color: 'black', hasMoved: false }, position: 'a8' };
  board['b8'] = { piece: { type: 'knight', color: 'black' }, position: 'b8' };
  board['c8'] = { piece: { type: 'bishop', color: 'black' }, position: 'c8' };
  board['d8'] = { piece: { type: 'queen', color: 'black' }, position: 'd8' };
  board['e8'] = { piece: { type: 'king', color: 'black', hasMoved: false }, position: 'e8' };
  board['f8'] = { piece: { type: 'bishop', color: 'black' }, position: 'f8' };
  board['g8'] = { piece: { type: 'knight', color: 'black' }, position: 'g8' };
  board['h8'] = { piece: { type: 'rook', color: 'black', hasMoved: false }, position: 'h8' };

  // Set up black pawns
  files.forEach(file => {
    board[`${file}7`] = { piece: { type: 'pawn', color: 'black', hasMoved: false }, position: `${file}7` };
  });

  return {
    board,
    currentPlayer: 'white',
    whiteKingPosition: 'e1',
    blackKingPosition: 'e8',
    whiteRooksMoved: { a1: false, h1: false },
    blackRooksMoved: { a8: false, h8: false },
    kingsMoved: { white: false, black: false },
    enPassantTarget: null,
    moveCount: 0
  };
};

export function useChessEngine() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);

  const resetGame = useCallback(() => {
    setGameState(createInitialGameState());
  }, []);

  const setBoard = useCallback((newBoard: { [key: string]: BoardCell }) => {
    setGameState(prev => ({
      ...prev,
      board: newBoard
    }));
  }, []);

  const initializeGame = useCallback(() => {
    setGameState(createInitialGameState());
  }, []);

  const setFEN = useCallback((fen: string) => {
    const chess = new ChessJS(fen);
    const board: { [key: string]: BoardCell } = {};
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = files[file] + rank;
        const piece = chess.get(square as any);
        board[square] = {
          piece: piece
            ? {
                type:
                  piece.type === 'n'
                    ? 'knight'
                    : piece.type === 'q'
                    ? 'queen'
                    : piece.type === 'r'
                    ? 'rook'
                    : piece.type === 'b'
                    ? 'bishop'
                    : piece.type === 'k'
                    ? 'king'
                    : 'pawn',
                color: piece.color === 'w' ? 'white' : 'black',
                hasMoved: undefined // Not tracked from FEN
              }
            : null,
          position: square
        };
      }
    }
    setGameState(prev => ({
      ...prev,
      board,
      currentPlayer: chess.turn() === 'w' ? 'white' : 'black',
      // Optionally update king/rook positions if needed
    }));
  }, []);

  const getSquareCoordinates = (square: string): { file: number; rank: number } => {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;
    return { file, rank };
  };

  const isValidSquare = (square: string): boolean => {
    const { file, rank } = getSquareCoordinates(square);
    return file >= 0 && file < 8 && rank >= 0 && rank < 8;
  };

  const getPieceAt = (square: string): ChessPiece | null => {
    return gameState.board[square]?.piece || null;
  };

  const isSquareOccupied = (square: string): boolean => {
    return getPieceAt(square) !== null;
  };

  const isSquareOccupiedByColor = (square: string, color: 'white' | 'black'): boolean => {
    const piece = getPieceAt(square);
    return piece?.color === color;
  };

  const getLegalMoves = useCallback((color: 'white' | 'black'): Move[] => {
    const moves: Move[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

    files.forEach(file => {
      ranks.forEach(rank => {
        const square = `${file}${rank}`;
        const piece = getPieceAt(square);
        
        if (piece && piece.color === color) {
          const pieceMoves = getPieceMoves(square, piece);
          moves.push(...pieceMoves);
        }
      });
    });

    return moves;
  }, [gameState.board]);

  const getPieceMoves = (square: string, piece: ChessPiece): Move[] => {
    const moves: Move[] = [];

    switch (piece.type) {
      case 'pawn':
        moves.push(...getPawnMoves(square, piece));
        break;
      case 'rook':
        moves.push(...getRookMoves(square, piece));
        break;
      case 'knight':
        moves.push(...getKnightMoves(square, piece));
        break;
      case 'bishop':
        moves.push(...getBishopMoves(square, piece));
        break;
      case 'queen':
        moves.push(...getQueenMoves(square, piece));
        break;
      case 'king':
        moves.push(...getKingMoves(square, piece));
        break;
    }

    return moves;
  };

  const getPawnMoves = (square: string, piece: ChessPiece): Move[] => {
    const moves: Move[] = [];
    const { file, rank } = getSquareCoordinates(square);
    const direction = piece.color === 'white' ? 1 : -1;
    const startRank = piece.color === 'white' ? 1 : 6;

    // Forward move
    const forwardSquare = `${String.fromCharCode('a'.charCodeAt(0) + file)}${rank + 1 + direction}`;
    if (isValidSquare(forwardSquare) && !isSquareOccupied(forwardSquare)) {
      moves.push({ from: square, to: forwardSquare, piece });
      
      // Double move from starting position
      if (rank === startRank) {
        const doubleSquare = `${String.fromCharCode('a'.charCodeAt(0) + file)}${rank + 1 + 2 * direction}`;
        if (isValidSquare(doubleSquare) && !isSquareOccupied(doubleSquare)) {
          moves.push({ from: square, to: doubleSquare, piece });
        }
      }
    }

    // Captures
    const captureFiles = [file - 1, file + 1];
    captureFiles.forEach(captureFile => {
      if (captureFile >= 0 && captureFile < 8) {
        const captureSquare = `${String.fromCharCode('a'.charCodeAt(0) + captureFile)}${rank + 1 + direction}`;
        if (isValidSquare(captureSquare) && isSquareOccupiedByColor(captureSquare, piece.color === 'white' ? 'black' : 'white')) {
          moves.push({ from: square, to: captureSquare, piece });
        }
      }
    });

    // En passant
    if (gameState.enPassantTarget) {
      const { file: epFile, rank: epRank } = getSquareCoordinates(gameState.enPassantTarget);
      if (Math.abs(file - epFile) === 1 && rank === epRank - direction) {
        moves.push({ from: square, to: gameState.enPassantTarget, piece });
      }
    }

    return moves;
  };

  const getRookMoves = (square: string, piece: ChessPiece): Move[] => {
    const moves: Move[] = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    directions.forEach(([df, dr]) => {
      let file = getSquareCoordinates(square).file + df;
      let rank = getSquareCoordinates(square).rank + dr;

      while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const targetSquare = `${String.fromCharCode('a'.charCodeAt(0) + file)}${rank + 1}`;
        const targetPiece = getPieceAt(targetSquare);

        if (!targetPiece) {
          moves.push({ from: square, to: targetSquare, piece });
        } else {
          if (targetPiece.color !== piece.color) {
            moves.push({ from: square, to: targetSquare, piece });
          }
          break;
        }

        file += df;
        rank += dr;
      }
    });

    return moves;
  };

  const getKnightMoves = (square: string, piece: ChessPiece): Move[] => {
    const moves: Move[] = [];
    const { file, rank } = getSquareCoordinates(square);
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    knightMoves.forEach(([df, dr]) => {
      const newFile = file + df;
      const newRank = rank + dr;

      if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
        const targetSquare = `${String.fromCharCode('a'.charCodeAt(0) + newFile)}${newRank + 1}`;
        const targetPiece = getPieceAt(targetSquare);

        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push({ from: square, to: targetSquare, piece });
        }
      }
    });

    return moves;
  };

  const getBishopMoves = (square: string, piece: ChessPiece): Move[] => {
    const moves: Move[] = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    directions.forEach(([df, dr]) => {
      let file = getSquareCoordinates(square).file + df;
      let rank = getSquareCoordinates(square).rank + dr;

      while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const targetSquare = `${String.fromCharCode('a'.charCodeAt(0) + file)}${rank + 1}`;
        const targetPiece = getPieceAt(targetSquare);

        if (!targetPiece) {
          moves.push({ from: square, to: targetSquare, piece });
        } else {
          if (targetPiece.color !== piece.color) {
            moves.push({ from: square, to: targetSquare, piece });
          }
          break;
        }

        file += df;
        rank += dr;
      }
    });

    return moves;
  };

  const getQueenMoves = (square: string, piece: ChessPiece): Move[] => {
    return [...getRookMoves(square, piece), ...getBishopMoves(square, piece)];
  };

  const getKingMoves = (square: string, piece: ChessPiece): Move[] => {
    const moves: Move[] = [];
    const { file, rank } = getSquareCoordinates(square);
    const kingMoves = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 1],
      [1, -1], [1, 0], [1, 1]
    ];

    kingMoves.forEach(([df, dr]) => {
      const newFile = file + df;
      const newRank = rank + dr;

      if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
        const targetSquare = `${String.fromCharCode('a'.charCodeAt(0) + newFile)}${newRank + 1}`;
        const targetPiece = getPieceAt(targetSquare);

        if (!targetPiece || targetPiece.color !== piece.color) {
          moves.push({ from: square, to: targetSquare, piece });
        }
      }
    });

    // Castling
    if (!piece.hasMoved) {
      const rooksMoved = piece.color === 'white' ? gameState.whiteRooksMoved : gameState.blackRooksMoved;
      
      // Kingside castling
      if (!rooksMoved.h1 && piece.color === 'white' || !rooksMoved.h8 && piece.color === 'black') {
        const kingsideSquare = piece.color === 'white' ? 'g1' : 'g8';
        const fSquare = piece.color === 'white' ? 'f1' : 'f8';
        
        if (!isSquareOccupied(fSquare) && !isSquareOccupied(kingsideSquare)) {
          moves.push({ from: square, to: kingsideSquare, piece });
        }
      }

      // Queenside castling
      if (!rooksMoved.a1 && piece.color === 'white' || !rooksMoved.a8 && piece.color === 'black') {
        const queensideSquare = piece.color === 'white' ? 'c1' : 'c8';
        const bSquare = piece.color === 'white' ? 'b1' : 'b8';
        const dSquare = piece.color === 'white' ? 'd1' : 'd8';
        
        if (!isSquareOccupied(bSquare) && !isSquareOccupied(dSquare) && !isSquareOccupied(queensideSquare)) {
          moves.push({ from: square, to: queensideSquare, piece });
        }
      }
    }

    return moves;
  };

  const makeMove = useCallback((from: string, to: string, piece: ChessPiece, promotion?: string) => {
    setGameState(prevState => {
      const newBoard = { ...prevState.board };
      
      // Remove piece from source
      newBoard[from] = { piece: null, position: from };
      
      // Place piece at destination
      const newPiece = promotion ? { type: promotion.slice(1) as any, color: piece.color } : piece;
      newBoard[to] = { piece: newPiece, position: to };
      
      // Update king position
      let newWhiteKingPosition = prevState.whiteKingPosition;
      let newBlackKingPosition = prevState.blackKingPosition;
      
      if (piece.type === 'king') {
        if (piece.color === 'white') {
          newWhiteKingPosition = to;
        } else {
          newBlackKingPosition = to;
        }
      }
      
      // Update rook moved status
      const newWhiteRooksMoved = { ...prevState.whiteRooksMoved };
      const newBlackRooksMoved = { ...prevState.blackRooksMoved };
      
      if (piece.type === 'rook') {
        if (piece.color === 'white') {
          newWhiteRooksMoved[from] = true;
        } else {
          newBlackRooksMoved[from] = true;
        }
      }
      
      // Update king moved status
      const newKingsMoved = { ...prevState.kingsMoved };
      if (piece.type === 'king') {
        newKingsMoved[piece.color] = true;
      }
      
      return {
        ...prevState,
        board: newBoard,
        currentPlayer: prevState.currentPlayer === 'white' ? 'black' : 'white',
        whiteKingPosition: newWhiteKingPosition,
        blackKingPosition: newBlackKingPosition,
        whiteRooksMoved: newWhiteRooksMoved,
        blackRooksMoved: newBlackRooksMoved,
        kingsMoved: newKingsMoved,
        moveCount: prevState.moveCount + 1
      };
    });
  }, []);

  const isCheckmate = useCallback((): boolean => {
    const currentColor = gameState.currentPlayer;
    const kingPosition = currentColor === 'white' ? gameState.whiteKingPosition : gameState.blackKingPosition;
    
    // Check if king is in check
    if (!isKingInCheck(kingPosition, currentColor)) {
      return false;
    }
    
    // Check if any legal moves can get king out of check
    const legalMoves = getLegalMoves(currentColor);
    return legalMoves.length === 0;
  }, [gameState, getLegalMoves]);

  const isStalemate = useCallback((): boolean => {
    const currentColor = gameState.currentPlayer;
    const kingPosition = currentColor === 'white' ? gameState.whiteKingPosition : gameState.blackKingPosition;
    
    // Check if king is in check
    if (isKingInCheck(kingPosition, currentColor)) {
      return false;
    }
    
    // Check if any legal moves are available
    const legalMoves = getLegalMoves(currentColor);
    return legalMoves.length === 0;
  }, [gameState, getLegalMoves]);

  const isDraw = useCallback((): boolean => {
    // Insufficient material
    const whitePieces = Object.values(gameState.board).filter(cell => cell.piece?.color === 'white');
    const blackPieces = Object.values(gameState.board).filter(cell => cell.piece?.color === 'black');
    
    if (whitePieces.length === 1 && blackPieces.length === 1) {
      return true; // King vs King
    }
    
    if (whitePieces.length === 2 && blackPieces.length === 1) {
      const whiteNonKing = whitePieces.find(p => p.piece?.type !== 'king');
      if (whiteNonKing?.piece?.type === 'knight' || whiteNonKing?.piece?.type === 'bishop') {
        return true; // King + Knight vs King
      }
    }
    
    if (whitePieces.length === 1 && blackPieces.length === 2) {
      const blackNonKing = blackPieces.find(p => p.piece?.type !== 'king');
      if (blackNonKing?.piece?.type === 'knight' || blackNonKing?.piece?.type === 'bishop') {
        return true; // King vs King + Knight
      }
    }
    
    // 50-move rule (simplified)
    if (gameState.moveCount >= 100) {
      return true;
    }
    
    return false;
  }, [gameState]);

  const isKingInCheck = (kingPosition: string, color: 'white' | 'black'): boolean => {
    const opponentColor = color === 'white' ? 'black' : 'white';
    const opponentMoves = getLegalMoves(opponentColor);
    
    return opponentMoves.some(move => move.to === kingPosition);
  };

  return {
    board: gameState.board,
    gameState,
    makeMove,
    getLegalMoves,
    isCheckmate,
    isStalemate,
    isDraw,
    resetGame,
    setBoard,
    setFEN,
    initializeGame,
    getPieceAt,
    isSquareOccupied,
    isSquareOccupiedByColor
  };
} 