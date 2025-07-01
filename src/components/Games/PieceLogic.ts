// Chess piece logic and move validation utilities

export interface ChessPiece {
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
  color: 'white' | 'black';
  hasMoved?: boolean;
}

export interface Move {
  from: string;
  to: string;
  piece: ChessPiece;
  promotion?: string;
  isCapture?: boolean;
  isEnPassant?: boolean;
  isCastling?: boolean;
}

export interface BoardState {
  [key: string]: {
    piece: ChessPiece | null;
    position: string;
  };
}

// Utility functions for chess logic
export const getSquareCoordinates = (square: string): { file: number; rank: number } => {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(square[1]) - 1;
  return { file, rank };
};

export const getSquareFromCoordinates = (file: number, rank: number): string => {
  return `${String.fromCharCode('a'.charCodeAt(0) + file)}${rank + 1}`;
};

export const isValidSquare = (square: string): boolean => {
  const { file, rank } = getSquareCoordinates(square);
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
};

export const getPieceAt = (board: BoardState, square: string): ChessPiece | null => {
  return board[square]?.piece || null;
};

export const isSquareOccupied = (board: BoardState, square: string): boolean => {
  return getPieceAt(board, square) !== null;
};

export const isSquareOccupiedByColor = (board: BoardState, square: string, color: 'white' | 'black'): boolean => {
  const piece = getPieceAt(board, square);
  return piece?.color === color;
};

// Move generation for each piece type
export const getPawnMoves = (board: BoardState, square: string, piece: ChessPiece, enPassantTarget: string | null): Move[] => {
  const moves: Move[] = [];
  const { file, rank } = getSquareCoordinates(square);
  const direction = piece.color === 'white' ? 1 : -1;
  const startRank = piece.color === 'white' ? 1 : 6;

  // Forward move
  const forwardSquare = getSquareFromCoordinates(file, rank + direction);
  if (isValidSquare(forwardSquare) && !isSquareOccupied(board, forwardSquare)) {
    moves.push({ from: square, to: forwardSquare, piece });
    
    // Double move from starting position
    if (rank === startRank) {
      const doubleSquare = getSquareFromCoordinates(file, rank + 2 * direction);
      if (isValidSquare(doubleSquare) && !isSquareOccupied(board, doubleSquare)) {
        moves.push({ from: square, to: doubleSquare, piece });
      }
    }
  }

  // Captures
  const captureFiles = [file - 1, file + 1];
  captureFiles.forEach(captureFile => {
    if (captureFile >= 0 && captureFile < 8) {
      const captureSquare = getSquareFromCoordinates(captureFile, rank + direction);
      if (isValidSquare(captureSquare) && isSquareOccupiedByColor(board, captureSquare, piece.color === 'white' ? 'black' : 'white')) {
        moves.push({ from: square, to: captureSquare, piece, isCapture: true });
      }
    }
  });

  // En passant
  if (enPassantTarget) {
    const { file: epFile, rank: epRank } = getSquareCoordinates(enPassantTarget);
    if (Math.abs(file - epFile) === 1 && rank === epRank - direction) {
      moves.push({ from: square, to: enPassantTarget, piece, isEnPassant: true });
    }
  }

  return moves;
};

export const getRookMoves = (board: BoardState, square: string, piece: ChessPiece): Move[] => {
  const moves: Move[] = [];
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  directions.forEach(([df, dr]) => {
    let file = getSquareCoordinates(square).file + df;
    let rank = getSquareCoordinates(square).rank + dr;

    while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
      const targetSquare = getSquareFromCoordinates(file, rank);
      const targetPiece = getPieceAt(board, targetSquare);

      if (!targetPiece) {
        moves.push({ from: square, to: targetSquare, piece });
      } else {
        if (targetPiece.color !== piece.color) {
          moves.push({ from: square, to: targetSquare, piece, isCapture: true });
        }
        break;
      }

      file += df;
      rank += dr;
    }
  });

  return moves;
};

export const getKnightMoves = (board: BoardState, square: string, piece: ChessPiece): Move[] => {
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
      const targetSquare = getSquareFromCoordinates(newFile, newRank);
      const targetPiece = getPieceAt(board, targetSquare);

      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ 
          from: square, 
          to: targetSquare, 
          piece, 
          isCapture: !!targetPiece 
        });
      }
    }
  });

  return moves;
};

export const getBishopMoves = (board: BoardState, square: string, piece: ChessPiece): Move[] => {
  const moves: Move[] = [];
  const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  directions.forEach(([df, dr]) => {
    let file = getSquareCoordinates(square).file + df;
    let rank = getSquareCoordinates(square).rank + dr;

    while (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
      const targetSquare = getSquareFromCoordinates(file, rank);
      const targetPiece = getPieceAt(board, targetSquare);

      if (!targetPiece) {
        moves.push({ from: square, to: targetSquare, piece });
      } else {
        if (targetPiece.color !== piece.color) {
          moves.push({ from: square, to: targetSquare, piece, isCapture: true });
        }
        break;
      }

      file += df;
      rank += dr;
    }
  });

  return moves;
};

export const getQueenMoves = (board: BoardState, square: string, piece: ChessPiece): Move[] => {
  return [...getRookMoves(board, square, piece), ...getBishopMoves(board, square, piece)];
};

export const getKingMoves = (board: BoardState, square: string, piece: ChessPiece, castlingRights: any): Move[] => {
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
      const targetSquare = getSquareFromCoordinates(newFile, newRank);
      const targetPiece = getPieceAt(board, targetSquare);

      if (!targetPiece || targetPiece.color !== piece.color) {
        moves.push({ 
          from: square, 
          to: targetSquare, 
          piece, 
          isCapture: !!targetPiece 
        });
      }
    }
  });

  // Castling logic would go here
  // This is simplified - full castling requires checking if king is in check, etc.

  return moves;
};

// Check detection
export const isKingInCheck = (board: BoardState, kingPosition: string, color: 'white' | 'black'): boolean => {
  const opponentColor = color === 'white' ? 'black' : 'white';
  
  // Check all opponent pieces to see if any can attack the king
  for (const [square, cell] of Object.entries(board)) {
    if (cell.piece && cell.piece.color === opponentColor) {
      const moves = getPieceMoves(board, square, cell.piece);
      if (moves.some(move => move.to === kingPosition)) {
        return true;
      }
    }
  }
  
  return false;
};

// Get all legal moves for a piece
export const getPieceMoves = (board: BoardState, square: string, piece: ChessPiece, enPassantTarget?: string | null): Move[] => {
  switch (piece.type) {
    case 'pawn':
      return getPawnMoves(board, square, piece, enPassantTarget || null);
    case 'rook':
      return getRookMoves(board, square, piece);
    case 'knight':
      return getKnightMoves(board, square, piece);
    case 'bishop':
      return getBishopMoves(board, square, piece);
    case 'queen':
      return getQueenMoves(board, square, piece);
    case 'king':
      return getKingMoves(board, square, piece, {}); // Simplified castling rights
    default:
      return [];
  }
};

// Validate if a move is legal (doesn't put own king in check)
export const isMoveLegal = (board: BoardState, move: Move): boolean => {
  // Create a copy of the board and make the move
  const newBoard = { ...board };
  newBoard[move.from] = { piece: null, position: move.from };
  newBoard[move.to] = { piece: move.piece, position: move.to };
  
  // Find the king position
  const kingPosition = move.piece.color === 'white' ? 
    Object.entries(newBoard).find(([_, cell]) => cell.piece?.type === 'king' && cell.piece.color === 'white')?.[0] :
    Object.entries(newBoard).find(([_, cell]) => cell.piece?.type === 'king' && cell.piece.color === 'black')?.[0];
  
  if (!kingPosition) return false;
  
  // Check if the move puts the king in check
  return !isKingInCheck(newBoard, kingPosition, move.piece.color);
};

// Get all legal moves for a color
export const getAllLegalMoves = (board: BoardState, color: 'white' | 'black', enPassantTarget?: string | null): Move[] => {
  const moves: Move[] = [];
  
  for (const [square, cell] of Object.entries(board)) {
    if (cell.piece && cell.piece.color === color) {
      const pieceMoves = getPieceMoves(board, square, cell.piece, enPassantTarget);
      const legalMoves = pieceMoves.filter(move => isMoveLegal(board, move));
      moves.push(...legalMoves);
    }
  }
  
  return moves;
};

// Check for checkmate
export const isCheckmate = (board: BoardState, color: 'white' | 'black', enPassantTarget?: string | null): boolean => {
  const kingPosition = color === 'white' ? 
    Object.entries(board).find(([_, cell]) => cell.piece?.type === 'king' && cell.piece.color === 'white')?.[0] :
    Object.entries(board).find(([_, cell]) => cell.piece?.type === 'king' && cell.piece.color === 'black')?.[0];
  
  if (!kingPosition) return false;
  
  // Check if king is in check
  if (!isKingInCheck(board, kingPosition, color)) {
    return false;
  }
  
  // Check if any legal moves can get king out of check
  const legalMoves = getAllLegalMoves(board, color, enPassantTarget);
  return legalMoves.length === 0;
};

// Check for stalemate
export const isStalemate = (board: BoardState, color: 'white' | 'black', enPassantTarget?: string | null): boolean => {
  const kingPosition = color === 'white' ? 
    Object.entries(board).find(([_, cell]) => cell.piece?.type === 'king' && cell.piece.color === 'white')?.[0] :
    Object.entries(board).find(([_, cell]) => cell.piece?.type === 'king' && cell.piece.color === 'black')?.[0];
  
  if (!kingPosition) return false;
  
  // Check if king is in check
  if (isKingInCheck(board, kingPosition, color)) {
    return false;
  }
  
  // Check if any legal moves are available
  const legalMoves = getAllLegalMoves(board, color, enPassantTarget);
  return legalMoves.length === 0;
};

// Check for insufficient material (draw)
export const isInsufficientMaterial = (board: BoardState): boolean => {
  const whitePieces = Object.values(board).filter(cell => cell.piece?.color === 'white');
  const blackPieces = Object.values(board).filter(cell => cell.piece?.color === 'black');
  
  // King vs King
  if (whitePieces.length === 1 && blackPieces.length === 1) {
    return true;
  }
  
  // King + Knight vs King
  if (whitePieces.length === 2 && blackPieces.length === 1) {
    const whiteNonKing = whitePieces.find(p => p.piece?.type !== 'king');
    if (whiteNonKing?.piece?.type === 'knight' || whiteNonKing?.piece?.type === 'bishop') {
      return true;
    }
  }
  
  if (whitePieces.length === 1 && blackPieces.length === 2) {
    const blackNonKing = blackPieces.find(p => p.piece?.type !== 'king');
    if (blackNonKing?.piece?.type === 'knight' || blackNonKing?.piece?.type === 'bishop') {
      return true;
    }
  }
  
  return false;
}; 