const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true
      }
    });
    if (users.length === 0) {
      console.log('No users found in database.');
      return;
    }
    console.log('Current users in database:');
    console.log('========================');
    users.forEach(user => {
      console.log(`- ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  isAdmin: ${user.isAdmin}`);
      console.log('');
    });
    console.log(`Total users: ${users.length}`);
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllUsers(); 