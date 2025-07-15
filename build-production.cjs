const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Chanspaw Platform for Production...\n');

// Function to run commands
function runCommand(command, cwd = '.') {
  try {
    console.log(`📦 Running: ${command}`);
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      shell: true 
    });
    console.log(`✅ Success: ${command}\n`);
  } catch (error) {
    console.error(`❌ Error running: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('⚠️  No .env file found. Creating from example...');
  if (fs.existsSync('env.example')) {
    fs.copyFileSync('env.example', '.env');
    console.log('✅ Created .env file from env.example');
  } else {
    console.log('⚠️  No env.example found. Please create .env file manually.');
  }
}

// Install dependencies for frontend
console.log('📦 Installing frontend dependencies...');
runCommand('npm install');

// Install redis for keep-alive script
console.log('📦 Installing redis package for keep-redis-alive.js...');
runCommand('npm install redis');

// Install dependencies for backend
console.log('📦 Installing backend dependencies...');
runCommand('npm install', './backend');

// Build frontend
console.log('🏗️  Building frontend...');
runCommand('npm run build');

// Copy backend to dist folder
console.log('📁 Copying backend to dist folder...');
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copy backend files
const backendFiles = [
  'server.js',
  'package.json',
  'package-lock.json',
  'prisma',
  'routes',
  'middleware',
  'models',
  'utils'
];

backendFiles.forEach(file => {
  const sourcePath = path.join('backend', file);
  const destPath = path.join('dist', file);
  
  if (fs.existsSync(sourcePath)) {
    if (fs.lstatSync(sourcePath).isDirectory()) {
      // Copy directory
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }
      fs.cpSync(sourcePath, destPath, { recursive: true });
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
    }
    console.log(`✅ Copied: ${file}`);
  }
});

// Copy environment files
if (fs.existsSync('.env')) {
  fs.copyFileSync('.env', 'dist/.env');
  console.log('✅ Copied: .env');
}

// Create production start script
const startScript = `#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Chanspaw Platform in Production Mode...\\n');

// Start backend
const backendProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

backendProcess.on('error', (error) => {
  console.error('❌ Backend error:', error);
});

backendProcess.on('close', (code) => {
  console.log(\`🔚 Backend stopped with code \${code}\`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down...');
  backendProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\\n🛑 Shutting down...');
  backendProcess.kill();
  process.exit(0);
});
`;

fs.writeFileSync('dist/start.js', startScript);
console.log('✅ Created: start.js');

// Create package.json for production
const packageJson = {
  name: "chanspaw-platform-production",
  version: "1.0.0",
  description: "Chanspaw Gaming Platform - Production Build",
  main: "start.js",
  scripts: {
    start: "node start.js",
    "start:backend": "node server.js",
    "db:migrate": "npx prisma migrate deploy",
    "db:generate": "npx prisma generate",
    "db:studio": "npx prisma studio"
  },
  dependencies: {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "multer": "^1.4.5-lts.1",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.7.0"
  },
  engines: {
    node: ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ Created: package.json');

// Create README for production
const readme = `# Chanspaw Platform - Production

## Quick Start

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your production values
   \`\`\`

3. Set up database:
   \`\`\`bash
   npx prisma generate
   npx prisma migrate deploy
   \`\`\`

4. Start the application:
   \`\`\`bash
   npm start
   \`\`\`

5. (Recommended) Start Redis keep-alive script:
   \`\`\`bash
   pm2 start keep-redis-alive.js --name keep-redis-alive
   pm2 save
   \`\`\`

## URLs

- Backend API: http://localhost:3001
- Frontend: http://localhost:5174 (if served separately)

## Admin Access

- Email: admin@chanspaw.com
- Password: Chanspaw@2025!

## Environment Variables

See .env.example for all required environment variables.

## Deployment

This build is ready for deployment to:
- Heroku
- Railway
- Vercel
- DigitalOcean
- AWS
- Any Node.js hosting platform
`;

fs.writeFileSync('dist/README.md', readme);
console.log('✅ Created: README.md');

console.log('\n🎉 Production build completed successfully!');
console.log('📁 Production files are in the "dist" folder');
console.log('🚀 To deploy:');
console.log('   1. Upload the "dist" folder to your hosting platform');
console.log('   2. Run "npm install" on the server');
console.log('   3. Set up your environment variables');
console.log('   4. Run "npm start" to start the application');
console.log('\n💡 For hosting platforms like Heroku, you can deploy directly from the dist folder!'); 