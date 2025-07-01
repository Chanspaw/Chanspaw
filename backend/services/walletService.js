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

/**
 * Payout winnings: 90% to winner, 10% to platform owner
 */
async function payoutWinnings(winnerId, amount, walletType) {
  const balanceField = walletType === 'real' ? 'real_balance' : 'virtual_balance';
  const totalPot = amount * 2;
  const winnerAmount = Math.floor(totalPot * 0.9);
  const platformAmount = totalPot - winnerAmount;

  // Credit winner
  await prisma.user.update({
    where: { id: winnerId },
    data: { [balanceField]: { increment: winnerAmount } }
  });

  // Credit platform owner
  const platformUser = await prisma.user.findFirst({ where: { isOwner: true } });
  if (platformUser) {
    await prisma.user.update({
      where: { id: platformUser.id },
      data: { [balanceField]: { increment: platformAmount } }
    });
  } else {
    throw new Error('No platform owner found');
  }
}

module.exports = {
  deductStake,
  payoutWinnings
}; 