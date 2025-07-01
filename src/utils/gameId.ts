// Utility to map frontend game IDs to backend game IDs
export function getGameId(gameId: string): string {
  const gameIds: { [key: string]: string } = {
    'chess': 'chess',
    'diamond-hunt': 'diamond_hunt',
    'connect-four': 'connect_four',
    'dice-battle': 'dice_battle',
    'tictactoe-5x5': 'tic_tac_toe'
  };
  return gameIds[gameId] || gameId;
} 