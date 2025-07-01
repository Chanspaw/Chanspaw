const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicateGames() {
  try {
    console.log('Cleaning duplicate games...');
    
    // Find all chess games
    const chessGames = await prisma.game.findMany({
      where: {
        name: 'Chess'
      }
    });
    
    console.log(`Found ${chessGames.length} chess games:`, chessGames.map(g => ({ id: g.id, icon: g.icon })));
    
    // Keep the one with id 'chess' and delete the others
    const gamesToDelete = chessGames.filter(game => game.id !== 'chess');
    
    if (gamesToDelete.length > 0) {
      console.log(`Deleting ${gamesToDelete.length} duplicate chess games...`);
      
      for (const game of gamesToDelete) {
        await prisma.game.delete({
          where: { id: game.id }
        });
        console.log(`Deleted chess game with id: ${game.id}`);
      }
    }
    
    // Check for other potential duplicates
    const allGames = await prisma.game.findMany();
    console.log('\nAll games after cleanup:');
    allGames.forEach(game => {
      console.log(`- ${game.name} (id: ${game.id}, icon: ${game.icon})`);
    });
    
    console.log('\n✅ Duplicate games cleaned successfully!');
    
  } catch (error) {
    console.error('Error cleaning duplicate games:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDuplicateGames(); 