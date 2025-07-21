const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');
require('dotenv').config();

/**
 * Deduct stake from a user's wallet (virtual or real)
 */
async function deductStake(userId, amount, walletType) {
  const balanceField = walletType === 'real' ? 'real_balance' : 'virtual_balance';
  return prisma.user.update({
    where: { id: userId },
    data: { [balanceField]: { decrement: amount } }
  });
}

// Create a NOWPayments deposit address for a user
async function createNowPaymentsDeposit({ amount, payCurrency = 'usdttrc20', priceCurrency = 'usd' }) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  const response = await axios.post(
    'https://api.nowpayments.io/v1/payment',
    {
      price_amount: amount,
      price_currency: priceCurrency,
      pay_currency: payCurrency
    },
    {
      headers: { 'x-api-key': apiKey }
    }
  );
  return response.data;
}

// Send a NOWPayments payout (withdrawal) to a user's wallet
async function sendNowPaymentsPayout({ address, amount, currency = 'usdttrc20' }) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  const response = await axios.post(
    'https://api.nowpayments.io/v1/payout',
    {
      address,
      amount,
      currency
    },
    {
      headers: { 'x-api-key': apiKey }
    }
  );
  return response.data;
}

// All payout, escrow, and balance logic is now handled by payoutService.js
// Only keep utility functions if needed.

module.exports = {
  deductStake,
  createNowPaymentsDeposit,
  sendNowPaymentsPayout
}; 