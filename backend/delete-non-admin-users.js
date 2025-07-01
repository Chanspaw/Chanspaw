const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_ID = 'CHS-000-USR';

async function deleteAllNonAdminUsersAndRelatedData() {
  try {
    // Find all users except admin
    const users = await prisma.user.findMany({ where: { id: { not: ADMIN_ID } }, select: { id: true, email: true, username: true } });
    const userIds = users.map(u => u.id);
    if (userIds.length === 0) {
      console.log('✅ No non-admin users found.');
      return;
    }
    console.log('🗑️ Deleting users and related data for:', users.map(u => `${u.username} <${u.email}>`));

    // List of tables with userId foreign key
    const tables = [
      'FriendRequest',
      'Friendship',
      'Message',
      'GameResult',
      'Transaction',
      'Notification',
      'KYCDocument',
      'SupportTicket',
      'Commission',
      'Wallet',
      // Add more tables as needed
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "userId" IN (${userIds.map(id => `'${id}'`).join(',')})`);
      } catch (e) {
        console.warn(`Warning: Could not clean table ${table}:`, e.message);
      }
    }

    // Finally, delete the users themselves
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.log('✅ Users and related data deleted.');
  } catch (err) {
    console.error('❌ Error deleting users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllNonAdminUsersAndRelatedData(); 