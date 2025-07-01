# Chess Piece Sprites

This folder should contain transparent PNG sprites for all chess pieces in a futuristic 3D style.

## Required Files

### White Pieces
- `white_pawn.png` - White pawn piece
- `white_rook.png` - White rook piece  
- `white_knight.png` - White knight piece
- `white_bishop.png` - White bishop piece
- `white_queen.png` - White queen piece
- `white_king.png` - White king piece

### Black Pieces
- `black_pawn.png` - Black pawn piece
- `black_rook.png` - Black rook piece
- `black_knight.png` - Black knight piece
- `black_bishop.png` - Black bishop piece
- `black_queen.png` - Black queen piece
- `black_king.png` - Black king piece

## Design Specifications

- **Size**: 64x64 pixels (or 128x128 for high DPI)
- **Format**: PNG with transparent background
- **Style**: Futuristic 3D design with subtle glow effects
- **Colors**: 
  - White pieces: Light metallic with blue/purple glow
  - Black pieces: Dark metallic with red/orange glow
- **Effects**: Subtle bevel, shadow, and glow to match the futuristic theme

## Design Inspiration

The pieces should have a sleek, modern look inspired by:
- Sci-fi chess sets
- Holographic displays
- Neon lighting effects
- Metallic surfaces with reflections

## Usage

The sprites are loaded dynamically in the ChessBoard component using:
```javascript
src={`/pieces/${piece.color}_${piece.type}.png`}
```

Example: `white_king.png` for a white king piece. 