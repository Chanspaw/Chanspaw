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
 * Payout winnings: 90% to winner, 10% to platform owner, all inside a transaction
 */
async function payoutWinnings(tx, winnerId, amount, walletType) {
  const balanceField = walletType === 'real' ? 'real_balance' : 'virtual_balance';
  const totalPot = amount * 2;
  const winnerAmount = Math.floor(totalPot * 0.9);
  const platformAmount = totalPot - winnerAmount;

  // Credit winner
  await tx.user.update({
    where: { id: winnerId },
    data: { [balanceField]: { increment: winnerAmount } }
  });
  await tx.transaction.create({
    data: {
      userId: winnerId,
      type: 'GAME_WIN',
      amount: winnerAmount,
      status: 'COMPLETED',
      description: 'Game win payout',
      metadata: JSON.stringify({ walletType })
    }
  });

  // Credit platform owner
  const platformUser = await tx.user.findFirst({ where: { isOwner: true } });
  if (platformUser) {
    await tx.user.update({
      where: { id: platformUser.id },
      data: { [balanceField]: { increment: platformAmount } }
    });
    await tx.transaction.create({
      data: {
        userId: platformUser.id,
        type: 'PLATFORM_FEE',
        amount: platformAmount,
        status: 'COMPLETED',
        description: 'Platform commission',
        metadata: JSON.stringify({ walletType })
      }
    });
  } else {
    throw new Error('No platform owner found');
  }
}

module.exports = {
  deductStake,
  payoutWinnings
}; 