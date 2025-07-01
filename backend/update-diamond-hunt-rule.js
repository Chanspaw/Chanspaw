const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const newRule = `A diamond is hidden randomly in a 5x5 grid (25 tiles).\n\nPlayers take turns choosing one tile at a time.\n\nEach player has 30 seconds to pick a tile during their turn.\n\nThe first player to find the hidden diamond wins the game.\n\nThe game ends as soon as the diamond is found.`;

async function main() {
  await prisma.gameRule.upsert({
    where: { gameType: 'diamond_hunt' },
    update: { rules_en: newRule },
    create: { gameType: 'diamond_hunt', rules_en: newRule }
  });
  console.log('Diamond Hunt rules updated.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect()); 