const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const express = require('express');
const router = express.Router();
const { createMatch, joinQueue, leaveQueue, makeMove } = require('../controllers/matchmakingController');

const prisma = new PrismaClient();

async function testRegistration() {
  try {
    const response = await fetch('http://localhost:3001/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser123',
        email: 'test123@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1990-01-01'
      })
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Registration successful!');
    } else {
      console.log('❌ Registration failed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRegistration(); 

async function createMatch(matchId, betAmount) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: 'testuser123',
        action: 'MATCH_CREATED',
        details: JSON.stringify({ matchId, betAmount })
      }
    });
    console.log('✅ Match created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createMatch('testMatchId', 100); 

exports.debitWallet = async (userId, amount) => {
  return await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.real_balance < amount) throw new Error('Insufficient funds');
    await tx.wallet.update({
      where: { userId },
      data: { real_balance: { decrement: amount } }
    });
    // Log audit
    await tx.auditLog.create({
      data: { userId, action: 'DEBIT', details: JSON.stringify({ amount }) }
    });
    return true;
  });
};

exports.creditWallet = async (userId, amount) => {
  return await prisma.wallet.update({
    where: { userId },
    data: { real_balance: { increment: amount } }
  });
};

// REST endpoints
router.post('/join', joinQueue);
router.post('/leave', leaveQueue);
router.post('/move', makeMove);

module.exports = router; 