const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateUserIds() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  const idMap = {};
  let nextNum = 1;

  // 1. Assign admin user to CHS-000-USR, others sequentially
  for (const user of users) {
    if (user.isAdmin) {
      if (user.id !== 'CHS-000-USR') {
        idMap[user.id] = 'CHS-000-USR';
      }
    } else {
      const padded = String(nextNum).padStart(3, '0');
      const newId = `CHS-${padded}-USR`;
      if (user.id !== newId) {
        idMap[user.id] = newId;
      }
      nextNum++;
    }
  }

  // 2. Update references in related tables
  const updateReferences = async (table, column) => {
    for (const [oldId, newId] of Object.entries(idMap)) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET "${column}" = $1 WHERE "${column}" = $2`,
        newId, oldId
      );
    }
  };

  await updateReferences('FriendRequest', 'senderId');
  await updateReferences('FriendRequest', 'receiverId');
  await updateReferences('Friendship', 'userId');
  await updateReferences('Friendship', 'friendId');
  await updateReferences('Message', 'senderId');
  await updateReferences('Message', 'receiverId');
  await updateReferences('GameResult', 'userId');
  await updateReferences('Transaction', 'userId');
  await updateReferences('Notification', 'userId');
  await updateReferences('KYCDocument', 'userId');
  await updateReferences('SupportTicket', 'userId');
  await updateReferences('CommissionEarning', 'userId');
  await updateReferences('EmailVerification', 'userId');
  await updateReferences('MatchmakingQueue', 'userId');
  await updateReferences('GameMove', 'userId');
  await updateReferences('AuditLog', 'userId');
  // Add more tables if needed

  // 3. Update user IDs
  for (const [oldId, newId] of Object.entries(idMap)) {
    await prisma.user.update({
      where: { id: oldId },
      data: { id: newId }
    });
  }

  console.log('✅ All user IDs migrated to CHS-XXX-USR format (admin: CHS-000-USR, users: CHS-001-USR, ...)');
  await prisma.$disconnect();
}

migrateUserIds().catch(e => {
  console.error(e);
  process.exit(1);
}); 