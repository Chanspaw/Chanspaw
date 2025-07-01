const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Chanspaw Platform...\n');

// Function to start a process
function startProcess(name, command, args, cwd) {
  console.log(`📦 Starting ${name}...`);
  
  const process = spawn(command, args, {
    cwd: cwd,
    stdio: 'inherit',
    shell: true
  });

  process.on('error', (error) => {
    console.error(`❌ Error starting ${name}:`, error.message);
  });

  process.on('close', (code) => {
    console.log(`🔚 ${name} stopped with code ${code}`);
  });

  return process;
}

// Start backend
const backendProcess = startProcess('Backend Server', 'node', ['server.js'], './backend');

// Wait a bit for backend to start, then start frontend
setTimeout(() => {
  console.log('\n⏳ Backend starting, waiting 3 seconds...\n');
  
  setTimeout(() => {
    const frontendProcess = startProcess('Frontend Server', 'npm', ['run', 'dev'], './');
    
    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down servers...');
      backendProcess.kill();
      frontendProcess.kill();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down servers...');
      backendProcess.kill();
      frontendProcess.kill();
      process.exit(0);
    });
  }, 3000);
}, 1000);

console.log('\n✅ Server startup initiated!');
console.log('📱 Frontend will be available at: http://localhost:5174/');
console.log('🔧 Backend will be available at: http://localhost:3001/');
console.log('\n💡 Press Ctrl+C to stop both servers\n'); 