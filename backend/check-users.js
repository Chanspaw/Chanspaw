const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isAdmin: true,
        isVerified: true,
        isActive: true
      }
    });
    
    console.log('Current users in database:');
    console.log('========================');
    
    if (users.length === 0) {
      console.log('No users found in database');
    } else {
      users.forEach(user => {
        console.log(`- ${user.username} (${user.email})`);
        console.log(`  Admin: ${user.isAdmin}, Verified: ${user.isVerified}, Active: ${user.isActive}`);
        console.log(`  ID: ${user.id}`);
        console.log('');
      });
    }
    
    console.log(`Total users: ${users.length}`);
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers(); 