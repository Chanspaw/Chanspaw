const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabaseKeepOnlyAdmin() {
  try {
    // Get admin user
    const admin = await prisma.user.findFirst({ where: { isAdmin: true } });
    if (!admin) {
      console.log('❌ No admin user found. Aborting.');
      return;
    }
    const adminId = admin.id;
    console.log('🧹 Cleaning database, keeping only admin:', adminId);

    // List of tables with userId foreign key
    const tablesWithUserId = [
      'FriendRequest',
      'Friendship',
      'Message',
      'GameResult',
      'Transaction',
      'Notification',
      'KYCDocument',
      'SupportTicket',
      'CommissionEarning',
      'EmailVerification',
      'MatchmakingQueue',
      'GameMove',
      'AuditLog',
    ];

    // Delete all records in these tables except those related to admin
    for (const table of tablesWithUserId) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "userId" != $1`,
        adminId
      );
    }
    // Special handling for FriendRequest and Friendship (senderId/receiverId, userId/friendId)
    await prisma.$executeRawUnsafe(
      `DELETE FROM "FriendRequest" WHERE "senderId" != $1 AND "receiverId" != $1`,
      adminId
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Friendship" WHERE "userId" != $1 AND "friendId" != $1`,
      adminId
    );

    // Delete all users except admin
    const deleted = await prisma.user.deleteMany({ where: { id: { not: adminId } } });
    console.log(`✅ Deleted ${deleted.count} users (kept only admin).`);
    console.log('✅ Database cleaned. Only admin remains.');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabaseKeepOnlyAdmin(); 