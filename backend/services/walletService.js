const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Deduct stake from a user's wallet (virtual or real)
 */
async function deductStake(userId, amount, walletType) {
  const balanceField = walletType === 'real' ? 'real_balance' : 'virtual_balance';
  return prisma.user.update({
    where: { id: userId },
    data: { [balanceField]: { decrement: amount } }
  });
}

// All payout, escrow, and balance logic is now handled by payoutService.js
// Only keep utility functions if needed.

module.exports = {
  deductStake,
}; 