import React from 'react';
import { motion } from 'framer-motion';
import classNames from 'classnames';

interface ChessPiece {
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
  color: 'white' | 'black';
}

interface BoardCell {
  piece: ChessPiece | null;
  position: string;
}

interface ChessBoardProps {
  board: { [key: string]: BoardCell };
  onCellClick: (square: string) => void;
  selectedSquare: string | null;
  legalMoves: string[];
  lastMove: string | null;
  isMyTurn: boolean;
  playerColor: 'white' | 'black';
}

export function ChessBoard({
  board,
  onCellClick,
  selectedSquare,
  legalMoves,
  lastMove,
  isMyTurn,
  playerColor
}: ChessBoardProps) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = playerColor === 'white' ? ['8', '7', '6', '5', '4', '3', '2', '1'] : ['1', '2', '3', '4', '5', '6', '7', '8'];

  const getSquareColor = (file: string, rank: string) => {
    const fileIndex = files.indexOf(file);
    const rankIndex = ranks.indexOf(rank);
    return (fileIndex + rankIndex) % 2 === 0 ? 'light' : 'dark';
  };

  const isLegalMove = (square: string) => legalMoves.includes(square);
  const isLastMove = (square: string) => lastMove?.includes(square);
  const isSelected = (square: string) => selectedSquare === square;

  const renderPiece = (piece: ChessPiece) => {
    // Map type/color to SVG filename (e.g., wP.svg, bK.svg)
    let typeCode = '';
    switch (piece.type) {
      case 'pawn': typeCode = 'P'; break;
      case 'rook': typeCode = 'R'; break;
      case 'knight': typeCode = 'N'; break;
      case 'bishop': typeCode = 'B'; break;
      case 'queen': typeCode = 'Q'; break;
      case 'king': typeCode = 'K'; break;
      default: typeCode = '';
    }
    const code = (piece.color === 'white' ? 'w' : 'b') + typeCode;
    return (
      <motion.img
        src={`/pieces/alpha/${code}.svg`}
        alt={`${piece.color} ${piece.type}`}
        className="w-full h-full object-contain drop-shadow-lg"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      />
    );
  };

  const renderLegalMoveIndicator = () => (
    <motion.div
      className="absolute inset-0 rounded-full bg-green-400/30 border-2 border-green-400"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.2 }}
    />
  );

  const renderLastMoveIndicator = () => (
    <motion.div
      className="absolute inset-0 rounded-full bg-yellow-400/20 border-2 border-yellow-400"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3 }}
    />
  );

  return (
    <div className="relative">
      {/* Board Container */}
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-2 sm:p-4 shadow-2xl border border-gray-700 overflow-x-auto">
        {/* Board Grid */}
        <div className="grid grid-cols-8 gap-0.5 w-full max-w-[96vw] sm:max-w-[480px] mx-auto game-board-mobile">
          {ranks.map((rank) =>
            files.map((file) => {
              const square = `${file}${rank}`;
              const cell = board[square];
              const squareColor = getSquareColor(file, rank);
              const isLight = squareColor === 'light';

              return (
                <motion.div
                  key={square}
                  className={classNames(
                    'relative w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16',
                    'flex items-center justify-center cursor-pointer',
                    'transition-all duration-200 ease-in-out',
                    'hover:shadow-lg hover:scale-105',
                    isLight 
                      ? 'bg-gradient-to-br from-gray-200 to-gray-300 shadow-inner' 
                      : 'bg-gradient-to-br from-gray-600 to-gray-700 shadow-inner',
                    isSelected(square) && 'ring-2 ring-blue-500 ring-offset-2',
                    isLegalMove(square) && 'hover:ring-2 hover:ring-green-400',
                    !isMyTurn && 'cursor-not-allowed opacity-75'
                  )}
                  onClick={() => isMyTurn && onCellClick(square)}
                  whileHover={isMyTurn ? { scale: 1.05 } : {}}
                  whileTap={isMyTurn ? { scale: 0.95 } : {}}
                >
                  {/* Legal Move Indicator */}
                  {isLegalMove(square) && renderLegalMoveIndicator()}
                  
                  {/* Last Move Indicator */}
                  {isLastMove(square) && renderLastMoveIndicator()}
                  
                  {/* Piece */}
                  {cell?.piece && (
                    <div className="relative z-10 w-full h-full p-1">
                      {renderPiece(cell.piece)}
                    </div>
                  )}
                  
                  {/* Square Label (for debugging) */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="absolute bottom-0 right-0 text-xs text-gray-500 opacity-50">
                      {square}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Board Border Glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 pointer-events-none" />
      </div>

      {/* File Labels */}
      <div className="flex justify-between mt-2 px-4">
        {files.map((file) => (
          <span key={file} className="text-gray-400 text-sm font-mono">
            {file}
          </span>
        ))}
      </div>

      {/* Rank Labels */}
      <div className="absolute left-0 top-4 bottom-4 flex flex-col justify-between py-4">
        {ranks.map((rank) => (
          <span key={rank} className="text-gray-400 text-sm font-mono">
            {rank}
          </span>
        ))}
      </div>
    </div>
  );
} 