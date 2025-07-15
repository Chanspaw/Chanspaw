const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Atomic payout system for all games and currencies
 * - Escrow both players' bets at match start
 * - On match end: 90% to winner, 10% to platform, $0 to loser, full refund on draw
 * - All updates in a single DB transaction
 * - Log every transaction in Transaction and PlatformRevenue
 * - Supports both real and virtual currencies
 */

async function escrowBets({ player1Id, player2Id, betAmount, currency, matchId, gameType }) {
  const balanceField = currency === 'real' ? 'real_balance' : 'virtual_balance';
  return await prisma.$transaction(async (tx) => {
    // Validate both balances
    const [p1, p2] = await Promise.all([
      tx.user.findUnique({ where: { id: player1Id } }),
      tx.user.findUnique({ where: { id: player2Id } })
    ]);
    if ((p1[balanceField] < betAmount) || (p2[balanceField] < betAmount)) {
      throw new Error('One or both players have insufficient balance');
    }
    // Deduct from both
    await tx.user.update({ where: { id: player1Id }, data: { [balanceField]: { decrement: betAmount } } });
    await tx.user.update({ where: { id: player2Id }, data: { [balanceField]: { decrement: betAmount } } });
    // Log transactions
    await tx.transaction.create({
      data: {
        userId: player1Id,
        type: 'GAME_BET',
        amount: -betAmount,
        status: 'COMPLETED',
        description: `Bet escrow for match ${matchId}`,
        metadata: JSON.stringify({ matchId, gameType, currency })
      }
    });
    await tx.transaction.create({
      data: {
        userId: player2Id,
        type: 'GAME_BET',
        amount: -betAmount,
        status: 'COMPLETED',
        description: `Bet escrow for match ${matchId}`,
        metadata: JSON.stringify({ matchId, gameType, currency })
      }
    });
    return true;
  });
}

async function payoutMatch({ matchId, gameType, player1Id, player2Id, winnerId, betAmount, currency, isDraw }) {
  const balanceField = currency === 'real' ? 'real_balance' : 'virtual_balance';
  return await prisma.$transaction(async (tx) => {
    // Refund both on draw
    if (isDraw) {
      await tx.user.update({ where: { id: player1Id }, data: { [balanceField]: { increment: betAmount } } });
      await tx.user.update({ where: { id: player2Id }, data: { [balanceField]: { increment: betAmount } } });
      await tx.transaction.create({
        data: {
          userId: player1Id,
          type: 'GAME_REFUND',
          amount: betAmount,
          status: 'COMPLETED',
          description: `Draw refund for match ${matchId}`,
          metadata: JSON.stringify({ matchId, gameType, currency })
        }
      });
      await tx.transaction.create({
        data: {
          userId: player2Id,
          type: 'GAME_REFUND',
          amount: betAmount,
          status: 'COMPLETED',
          description: `Draw refund for match ${matchId}`,
          metadata: JSON.stringify({ matchId, gameType, currency })
        }
      });
      await tx.platformRevenue.create({
        data: {
          matchId,
          gameType,
          amount: 0,
          currency,
          player1Id,
          player2Id,
          winnerId: null,
          platformCut: 0,
          metadata: JSON.stringify({ result: 'draw' })
        }
      });
      return { winnerId: null, platformCut: 0, refunded: true };
    }
    // Normal win/loss payout
    const totalPot = betAmount * 2;
    const winnerAmount = Math.floor(totalPot * 0.9 * 100) / 100;
    const platformAmount = totalPot - winnerAmount;
    // Credit winner
    await tx.user.update({ where: { id: winnerId }, data: { [balanceField]: { increment: winnerAmount } } });
    await tx.transaction.create({
      data: {
        userId: winnerId,
        type: 'GAME_WIN',
        amount: winnerAmount,
        status: 'COMPLETED',
        description: `Win payout for match ${matchId}`,
        metadata: JSON.stringify({ matchId, gameType, currency })
      }
    });
    // Credit platform owner
    let platformUser = await tx.user.findFirst({ where: { isOwner: true } });
    if (!platformUser) {
      platformUser = await tx.user.findFirst({ where: { isAdmin: true } });
      if (platformUser) {
        await tx.user.update({ where: { id: platformUser.id }, data: { isOwner: true } });
      }
    }
    if (!platformUser) throw new Error('No platform owner/admin found');
    await tx.user.update({ where: { id: platformUser.id }, data: { [balanceField]: { increment: platformAmount } } });
    await tx.transaction.create({
      data: {
        userId: platformUser.id,
        type: 'PLATFORM_FEE',
        amount: platformAmount,
        status: 'COMPLETED',
        description: `Platform fee for match ${matchId}`,
        metadata: JSON.stringify({ matchId, gameType, currency })
      }
    });
    // Log platform revenue
    await tx.platformRevenue.create({
      data: {
        matchId,
        gameType,
        amount: totalPot,
        currency,
        player1Id,
        player2Id,
        winnerId,
        platformCut: platformAmount,
        metadata: JSON.stringify({ result: 'win' })
      }
    });
    return { winnerId, platformCut: platformAmount, refunded: false };
  });
}

module.exports = {
  escrowBets,
  payoutMatch
}; 