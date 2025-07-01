const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('Creating test users for matchmaking...');

    // Create test user 1
    const testUser1 = await prisma.user.create({
      data: {
        email: 'testuser1@test.com',
        username: 'TestPlayer1',
        password: await bcrypt.hash('password123', 10),
        real_balance: 0,
        virtual_balance: 5000,
        isVerified: true,
        isActive: true
      }
    });

    // Create test user 2
    const testUser2 = await prisma.user.create({
      data: {
        email: 'testuser2@test.com',
        username: 'TestPlayer2',
        password: await bcrypt.hash('password123', 10),
        real_balance: 0,
        virtual_balance: 5000,
        isVerified: true,
        isActive: true
      }
    });

    // Create test user 3
    const testUser3 = await prisma.user.create({
      data: {
        email: 'testuser3@test.com',
        username: 'TestPlayer3',
        password: await bcrypt.hash('password123', 10),
        real_balance: 0,
        virtual_balance: 5000,
        isVerified: true,
        isActive: true
      }
    });

    console.log('✅ Test users created successfully!');
    console.log('\n📋 Test User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('User 1: testuser1@test.com / password123');
    console.log('User 2: testuser2@test.com / password123');
    console.log('User 3: testuser3@test.com / password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💰 Each user has:');
    console.log('   • $1000 real money');
    console.log('   • 5000 virtual coins');
    console.log('\n🎮 How to test matchmaking:');
    console.log('   1. Open 2 different browser tabs/windows');
    console.log('   2. Login with different test accounts');
    console.log('   3. Both join matchmaking with same stake');
    console.log('   4. They should be matched immediately!');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers(); 