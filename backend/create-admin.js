const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function generateUserId(existingIds = new Set()) {
  let newId;
  do {
    const num = Math.floor(100 + Math.random() * 900);
    newId = `CHS-${num}-USR`;
  } while (existingIds.has(newId));
  return newId;
}

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@chanspaw.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Chanspaw@2025!', 10);

    // Create admin user
    const users = await prisma.user.findMany({ select: { id: true } });
    const existingIds = new Set(users.map(u => u.id));
    const newId = generateUserId(existingIds);

    const admin = await prisma.user.create({
      data: {
        id: 'CHS-000-USR',
        email: 'admin@chanspaw.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
        isVerified: true,
        isActive: true,
        real_balance: 0,
        virtual_balance: 0
      }
    });

    console.log('Admin user created successfully!');
    console.log('Email: admin@chanspaw.com');
    console.log('Password: Chanspaw@2025!');
    console.log('User ID:', admin.id);

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

// Script to set admin@chanspaw.com as the platform owner
async function setOwner() {
  const email = 'admin@chanspaw.com';
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User with email ${email} not found.`);
    process.exit(1);
  }
  if (user.isOwner) {
    console.log(`User ${email} is already the owner.`);
    process.exit(0);
  }
  await prisma.user.update({ where: { email }, data: { isOwner: true } });
  console.log(`User ${email} is now set as the platform owner (isOwner=true).`);
  process.exit(0);
}

setOwner().catch(e => { console.error(e); process.exit(1); }); 