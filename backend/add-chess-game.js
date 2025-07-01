const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addChessGame() {
  try {
    // Check if chess game already exists
    const existingGame = await prisma.game.findFirst({
      where: { name: 'Chess' }
    });

    if (existingGame) {
      console.log('Chess game already exists in database');
      return;
    }

    // Create chess game
    const chessGame = await prisma.game.create({
      data: {
        name: 'Chess',
        description: 'Strategic battle of minds on a 8x8 board. Capture the opponent\'s king to win!',
        icon: '♔',
        minBet: 10,
        maxBet: 1000,
        players: '2',
        isActive: true
      }
    });

    // Create chess game rules
    const chessRules = [
      {
        name: 'Time Control',
        type: 'select',
        value: '10min',
        description: 'Time limit per player',
        options: ['5min', '10min', '15min', '30min', '60min']
      },
      {
        name: 'AI Difficulty',
        type: 'select',
        value: 'medium',
        description: 'AI opponent difficulty level',
        options: ['beginner', 'novice', 'medium', 'advanced', 'expert']
      },
      {
        name: 'Move Validation',
        type: 'boolean',
        value: 'true',
        description: 'Enable strict chess move validation'
      },
      {
        name: 'Auto-Promotion',
        type: 'select',
        value: 'queen',
        description: 'Default piece for pawn promotion',
        options: ['queen', 'rook', 'bishop', 'knight']
      },
      {
        name: 'Show Valid Moves',
        type: 'boolean',
        value: 'true',
        description: 'Highlight valid moves for selected pieces'
      },
      {
        name: 'Sound Effects',
        type: 'boolean',
        value: 'true',
        description: 'Enable sound effects for moves and captures'
      },
      {
        name: 'Move History',
        type: 'boolean',
        value: 'true',
        description: 'Display move history during the game'
      },
      {
        name: 'Captured Pieces',
        type: 'boolean',
        value: 'true',
        description: 'Show captured pieces display'
      }
    ];

    // Create game rules
    await Promise.all(chessRules.map(rule => 
      prisma.gameRule.create({
        data: {
          gameId: chessGame.id,
          name: rule.name,
          type: rule.type,
          value: rule.value,
          description: rule.description,
          options: rule.options || []
        }
      })
    ));

    console.log('✅ Chess game added successfully!');
    console.log('Game ID:', chessGame.id);
    console.log('Rules created:', chessRules.length);

  } catch (error) {
    console.error('❌ Error adding chess game:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addChessGame(); 