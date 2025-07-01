const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeGames() {
  try {
    console.log('Removing Mills and SimpleDiceGame from database...');
    
    // Remove Mills game
    const millsGame = await prisma.game.findFirst({
      where: { name: "Mills (Nine Men's Morris)" }
    });
    
    if (millsGame) {
      await prisma.game.delete({
        where: { id: millsGame.id }
      });
      console.log('✅ Removed Mills game from database');
    } else {
      console.log('ℹ️ Mills game not found in database');
    }
    
    // Remove SimpleDiceGame
    const simpleDiceGame = await prisma.game.findFirst({
      where: { name: 'Simple Dice Game' }
    });
    
    if (simpleDiceGame) {
      await prisma.game.delete({
        where: { id: simpleDiceGame.id }
      });
      console.log('✅ Removed Simple Dice Game from database');
    } else {
      console.log('ℹ️ Simple Dice Game not found in database');
    }
    
    console.log('✅ Database cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error removing games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeGames(); 