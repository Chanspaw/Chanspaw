// keep-redis-alive.js
// Keeps Redis connection alive by pinging every 60 seconds
// Usage: node keep-redis-alive.js

const { createClient } = require('redis');

// --- Redis connection config ---
// You can set these via environment variables for security
const REDIS_URL = process.env.REDIS_URL || 'rediss://default:AcB3AAIjcDExYzNiOGM2YzE2Nzg0YzYzOTcxODQyY2Y0NjdhMzFiY3AxMA@immense-tarpon-49271.upstash.io:6379';

const client = createClient({
  url: REDIS_URL,
});

client.on('error', (err) => {
  console.error('Redis connection error:', err);
  process.exit(1);
});

async function sendPing() {
  try {
    const timestamp = Date.now();
    await client.set('chanspaw:ping', timestamp);
    console.log(`Redis ping sent at: ${timestamp}`);
  } catch (err) {
    console.error('Redis ping error:', err);
    process.exit(1);
  }
}

async function main() {
  try {
    await client.connect();
    await sendPing();
    setInterval(sendPing, 60 * 1000);
  } catch (err) {
    console.error('Redis initial connection failed:', err);
    process.exit(1);
  }
}

main(); 