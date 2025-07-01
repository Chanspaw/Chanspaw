const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('./utils/auth');

const prisma = new PrismaClient();

function generateUserId(existingIds = new Set()) {
  let newId;
  do {
    const num = Math.floor(100 + Math.random() * 900);
    newId = `CHS-${num}-USR`;
  } while (existingIds.has(newId));
  return newId;
}

async function resetUsersAndKeepOnlyAdmin() {
  try {
    console.log('🗑️  Deleting all users except admin...');
    
    // Delete all non-admin users
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        isAdmin: false
      }
    });
    
    console.log(`✅ Deleted ${deletedUsers.count} non-admin users`);
    
    // Check if admin exists, if not create one
    const adminExists = await prisma.user.findFirst({
      where: {
        isAdmin: true
      }
    });
    
    if (!adminExists) {
      console.log('👤 Creating admin user...');
      const adminPassword = 'Chanspaw@2025!';
      const hashedPassword = await hashPassword(adminPassword);
      
      const users = await prisma.user.findMany({ select: { id: true } });
      const existingIds = new Set(users.map(u => u.id));
      const newId = generateUserId(existingIds);
      
      const adminUser = await prisma.user.create({
        data: {
          id: 'CHS-000-USR',
          username: 'admin',
          email: 'admin@chanspaw.com',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          dateOfBirth: new Date('1990-01-01'),
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
          real_balance: 0,
          virtual_balance: 0,
          isAdmin: true,
          isVerified: true,
          isActive: true
        }
      });
      
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@chanspaw.com');
      console.log('🔑 Password: Chanspaw@2025!');
      console.log('🆔 User ID:', adminUser.id);
      console.log('💰 Real Balance: $0, Virtual Balance: $0');
    } else {
      console.log('✅ Admin user already exists');
      console.log('📧 Email: admin@chanspaw.com');
      console.log('🔑 Password: Chanspaw@2025!');
    }
    
    // Get total user count
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total users in database: ${totalUsers}`);
    
    console.log('\n🎉 Database reset complete!');
    console.log('🚀 Only admin user remains in the database');
    
  } catch (error) {
    console.error('❌ Error resetting users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetUsersAndKeepOnlyAdmin(); 