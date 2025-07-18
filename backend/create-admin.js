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

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error('Usage: node create-admin.js <email> <password>');
    process.exit(1);
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword, isAdmin: true, isActive: true }
    });
    console.log(`Admin user updated: ${email}`);
  } else {
    // Generate unique user ID
    const users = await prisma.user.findMany({ select: { id: true } });
    let newId = 'CHS-000-USR';
    if (users.length > 0) {
      const ids = users.map(u => u.id).filter(id => /^CHS-\d{3}-USR$/.test(id));
      const nums = ids.map(id => parseInt(id.split('-')[1], 10)).filter(n => !isNaN(n));
      const max = nums.length > 0 ? Math.max(...nums) : 0;
      newId = `CHS-${String(max + 1).padStart(3, '0')}-USR`;
    }
    user = await prisma.user.create({
      data: {
        id: newId,
        email,
        username: email.split('@')[0],
        password: hashedPassword,
        isAdmin: true,
        isActive: true,
        isVerified: true,
        real_balance: 0,
        virtual_balance: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log(`Admin user created: ${email} (id: ${newId})`);
  }
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

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