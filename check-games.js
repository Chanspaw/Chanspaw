const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGames() {
  try {
    const games = await prisma.game.findMany();
    console.log('Games in database:', games);
    
    if (games.length === 0) {
      console.log('No games found in database. Creating default games...');
      
      const defaultGames = [
        {
          id: 'chess',
          name: 'Chess',
          description: 'Classic strategic chess game. Checkmate your opponent to win!',
          icon: 'Crown',
          minBet: 10,
          maxBet: 100,
          players: '2 players',
          isActive: true
        },
        {
          id: 'diamond-hunt',
          name: 'Diamond Hunt',
          description: 'Find diamonds in an 8x8 grid before your opponent. Each diamond is worth 10 points!',
          icon: 'Gem',
          minBet: 10,
          maxBet: 100,
          players: '2 players',
          isActive: true
        },
        {
          id: 'connect-four',
          name: 'Connect Four',
          description: 'Classic connect four with a competitive twist. Get 4 in a row to win!',
          icon: 'Circle',
          minBet: 5,
          maxBet: 50,
          players: '2 players',
          isActive: true
        },
        {
          id: 'dice-battle',
          name: 'Dice Battle',
          description: 'Roll dice and outscore your opponent. First to 3 wins or highest total after 5 rounds!',
          icon: 'Dice6',
          minBet: 1,
          maxBet: 25,
          players: '2 players',
          isActive: true
        },
        {
          id: 'tictactoe-5x5',
          name: 'Tic-Tac-Toe 5x5',
          description: 'Extended tic-tac-toe on a 5x5 board. Get 5 in a row to win!',
          icon: 'Grid3X3',
          minBet: 5,
          maxBet: 30,
          players: '2 players',
          isActive: true
        }
      ];
      
      for (const game of defaultGames) {
        await prisma.game.create({
          data: game
        });
        console.log(`Created game: ${game.name}`);
      }
      
      console.log('Default games created successfully!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGames(); 