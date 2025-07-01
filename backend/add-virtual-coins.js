const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addVirtualCoins() {
  try {
    console.log('🪙 Adding virtual coins to admin user...');
    
    // Find admin user
    const admin = await prisma.user.findFirst({
      where: {
        isAdmin: true
      }
    });
    
    if (!admin) {
      console.log('❌ No admin user found');
      return;
    }
    
    // Add virtual coins
    const updatedAdmin = await prisma.user.update({
      where: {
        id: admin.id
      },
      data: {
        virtual_balance: 50000 // Add 50,000 virtual coins
      }
    });
    
    console.log(`✅ Successfully added virtual coins to admin user:`);
    console.log(`   Username: ${updatedAdmin.username}`);
    console.log(`   Email: ${updatedAdmin.email}`);
    console.log(`   Real Balance: $${updatedAdmin.real_balance}`);
    console.log(`   Virtual Balance: ${updatedAdmin.virtual_balance} coins`);
    
  } catch (error) {
    console.error('❌ Error adding virtual coins:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addVirtualCoins(); 