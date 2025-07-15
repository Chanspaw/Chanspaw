const { execSync } = require('child_process');

function run(command) {
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit', shell: true });
}

console.log('🚀 Building Chanspaw Platform for Production...');

run('npm install');
run('npm run build');
run('cd backend && npm install');
run('npx prisma generate --schema=backend/prisma/schema.prisma');
run('npx prisma migrate deploy --schema=backend/prisma/schema.prisma');
run('cp -r dist backend/dist');

console.log('✅ Build complete!'); 