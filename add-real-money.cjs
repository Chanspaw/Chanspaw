const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addRealMoney() {
  try {
    console.log('💰 Adding real money to test users...');
    
    // Find all users (excluding admin)
    const users = await prisma.user.findMany({
      where: {
        isAdmin: false
      },
      select: {
        id: true,
        username: true,
        email: true,
        real_balance: true,
        virtual_balance: true
      }
    });
    
    if (users.length === 0) {
      console.log('❌ No test users found');
      return;
    }
    
    console.log(`📊 Found ${users.length} test users`);
    
    // Add 500 real money to each user
    for (const user of users) {
      const updatedUser = await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          real_balance: 500
        },
        select: {
          id: true,
          username: true,
          email: true,
          real_balance: true,
          virtual_balance: true
        }
      });
      
      console.log(`✅ Updated user: ${updatedUser.username} (${updatedUser.email})`);
      console.log(`   Real Balance: $${updatedUser.real_balance}`);
      console.log(`   Virtual Balance: ${updatedUser.virtual_balance}`);
      console.log('---');
    }
    
    console.log('🎉 Successfully added $500 real money to all test users!');
    
  } catch (error) {
    console.error('❌ Error adding real money:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
addRealMoney(); 