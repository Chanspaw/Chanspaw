const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const rules = [
  {
    gameType: 'diamond_hunt',
    rules_en: `Players take turns picking hidden tiles.\n\nSome tiles hide diamonds, others hide traps.\n\nEach diamond earns 1 point.\n\nIf you hit a trap, you lose your turn.\n\nThe player with the most diamonds at the end wins.`
  },
  {
    gameType: 'connect_four',
    rules_en: `Players take turns dropping colored discs into a 7x6 grid.\n\nThe goal is to connect 4 of your discs in a row: vertically, horizontally, or diagonally.\n\nFirst player to connect 4 wins.\n\nIf the grid fills with no winner, it's a draw.`
  },
  {
    gameType: 'dice_battle',
    rules_en: `2 players take turns rolling 2 dice.\n\nThe game lasts 5 rounds.\n\nThe player with the highest total score wins.\n\nIf a player wins 3 rounds first, they win the game.\n\nTies are broken with an extra roll.`
  },
  {
    gameType: 'tic_tac_toe_5x5',
    rules_en: `2 players take turns placing X or O on a 5x5 board.\n\nFirst to align 4 symbols in a row (horizontal, vertical, or diagonal) wins.\n\nEach player has 30 seconds per move.\n\nIf the board is full with no winner, the game ends in a draw.`
  }
];

async function main() {
  for (const rule of rules) {
    await prisma.gameRule.upsert({
      where: { gameType: rule.gameType },
      update: { rules_en: rule.rules_en },
      create: rule
    });
  }
  console.log('Default game rules inserted/updated.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect()); 