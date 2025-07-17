const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();
const router = express.Router();

// Multilingual error helper
const t = (key, lang = 'en') => {
  const messages = {
    'invite.not_found': {
      en: 'Invite not found.',
      fr: "Invitation introuvable.",
      ht: "Envitasyon pa jwenn."
    },
    'invite.expired': {
      en: 'Invite expired.',
      fr: "Invitation expirée.",
      ht: "Envitasyon ekspire."
    },
    'invite.duplicate': {
      en: 'Duplicate invite.',
      fr: "Invitation déjà envoyée.",
      ht: "Envitasyon deja voye."
    },
    'invite.self': {
      en: 'Cannot invite yourself.',
      fr: "Vous ne pouvez pas vous inviter.",
      ht: "Ou pa ka envite tèt ou."
    },
    'invite.balance': {
      en: 'Insufficient balance.',
      fr: "Solde insuffisant.",
      ht: "Balanse pa ase."
    },
    'invite.accepted': {
      en: 'Invite accepted.',
      fr: "Invitation acceptée.",
      ht: "Envitasyon aksepte."
    },
    'invite.declined': {
      en: 'Invite declined.',
      fr: "Invitation refusée.",
      ht: "Envitasyon refize."
    },
    'invite.cancelled': {
      en: 'Invite cancelled.',
      fr: "Invitation annulée.",
      ht: "Envitasyon anile."
    },
    'invite.created': {
      en: 'Invite sent.',
      fr: "Invitation envoyée.",
      ht: "Envitasyon voye."
    },
    'invite.timeout': {
      en: 'Invite timed out.',
      fr: "Invitation expirée.",
      ht: "Envitasyon ekspire."
    },
    'invite.already_accepted': {
      en: 'Invite already accepted.',
      fr: "Invitation déjà acceptée.",
      ht: "Envitasyon deja aksepte."
    },
    'invite.invalid': {
      en: 'Invalid invite.',
      fr: "Invitation invalide.",
      ht: "Envitasyon pa valab."
    },
    'invite.admin_action': {
      en: 'Admin action completed.',
      fr: "Action admin terminée.",
      ht: "Aksyon admin fini."
    }
  };
  return messages[key]?.[lang] || messages[key]?.en || key;
};

// Helper: expire invites after 5 minutes
async function expireOldInvites() {
  const now = new Date();
  await prisma.invite.updateMany({
    where: {
      status: 'pending',
      expiresAt: { lt: now }
    },
    data: { status: 'expired' }
  });
}
setInterval(expireOldInvites, 60 * 1000); // every minute

// Create invite
router.post('/create', authenticateToken, asyncHandler(async (req, res) => {
  const { toUserId, gameType, betAmount, matchType = 'real' } = req.body;
  const fromUserId = req.user.id;
  const lang = req.headers['accept-language'] || 'en';
  if (fromUserId === toUserId) return res.status(400).json({ error: t('invite.self', lang) });
  // Check duplicate
  const existing = await prisma.invite.findFirst({
    where: {
      fromUserId,
      toUserId,
      gameType,
      status: 'pending'
    }
  });
  if (existing) return res.status(409).json({ error: t('invite.duplicate', lang) });
  // Check balance
  const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } });
  const balanceField = matchType === 'real' ? 'real_balance' : 'virtual_balance';
  if (fromUser[balanceField] < betAmount) return res.status(400).json({ error: t('invite.balance', lang) });
  // Create invite
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const invite = await prisma.invite.create({
    data: { fromUserId, toUserId, gameType, betAmount, matchType, status: 'pending', expiresAt }
  });
  // Notify via socket
  const io = req.app.get('io');
  if (io) io.to(toUserId).emit('invite:received', { ...invite, fromUser: { id: fromUserId, username: fromUser.username } });
  // Log
  await prisma.auditLog.create({ data: { userId: fromUserId, action: 'INVITE_SENT', details: JSON.stringify({ toUserId, gameType, betAmount, matchType }) } });
  res.json({ success: true, message: t('invite.created', lang), data: invite });
}));

// Accept invite
router.post('/accept', authenticateToken, asyncHandler(async (req, res) => {
  const { inviteId } = req.body;
  const userId = req.user.id;
  const lang = req.headers['accept-language'] || 'en';
  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite) return res.status(404).json({ error: t('invite.not_found', lang) });
  if (invite.status !== 'pending') return res.status(400).json({ error: t('invite.already_accepted', lang) });
  if (invite.toUserId !== userId) return res.status(403).json({ error: t('invite.invalid', lang) });
  // Check balance
  const toUser = await prisma.user.findUnique({ where: { id: userId } });
  const balanceField = invite.matchType === 'real' ? 'real_balance' : 'virtual_balance';
  if (toUser[balanceField] < invite.betAmount) return res.status(400).json({ error: t('invite.balance', lang) });
  // Update invite
  await prisma.invite.update({ where: { id: inviteId }, data: { status: 'accepted' } });
  // Create match and escrow
  const match = await prisma.match.create({
    data: {
      gameType: invite.gameType,
      player1Id: invite.fromUserId,
      player2Id: invite.toUserId,
      betAmount: invite.betAmount,
      status: 'IN_PROGRESS',
      matchType: invite.matchType,
      gameState: '{}',
      startedAt: new Date()
    }
  });
  // Notify both users with matchFound event
  const io = req.app.get('io');
  if (io) {
    io.to(invite.fromUserId).emit('matchFound', { matchId: match.id, gameType: match.gameType });
    io.to(invite.toUserId).emit('matchFound', { matchId: match.id, gameType: match.gameType });
  }
  // Log
  await prisma.auditLog.create({ data: { userId, action: 'INVITE_ACCEPTED', details: JSON.stringify({ inviteId, matchId: match.id }) } });
  res.json({ success: true, message: t('invite.accepted', lang), matchId: match.id });
}));

// Decline invite
router.post('/decline', authenticateToken, asyncHandler(async (req, res) => {
  const { inviteId } = req.body;
  const userId = req.user.id;
  const lang = req.headers['accept-language'] || 'en';
  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite) return res.status(404).json({ error: t('invite.not_found', lang) });
  if (invite.status !== 'pending') return res.status(400).json({ error: t('invite.already_accepted', lang) });
  if (invite.toUserId !== userId) return res.status(403).json({ error: t('invite.invalid', lang) });
  await prisma.invite.update({ where: { id: inviteId }, data: { status: 'declined' } });
  // Notify
  const io = req.app.get('io');
  if (io) io.to(invite.fromUserId).emit('invite:declined', { inviteId });
  // Log
  await prisma.auditLog.create({ data: { userId, action: 'INVITE_DECLINED', details: JSON.stringify({ inviteId }) } });
  res.json({ success: true, message: t('invite.declined', lang) });
}));

// Cancel invite (by sender)
router.post('/cancel', authenticateToken, asyncHandler(async (req, res) => {
  const { inviteId } = req.body;
  const userId = req.user.id;
  const lang = req.headers['accept-language'] || 'en';
  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite) return res.status(404).json({ error: t('invite.not_found', lang) });
  if (invite.status !== 'pending') return res.status(400).json({ error: t('invite.already_accepted', lang) });
  if (invite.fromUserId !== userId) return res.status(403).json({ error: t('invite.invalid', lang) });
  await prisma.invite.update({ where: { id: inviteId }, data: { status: 'cancelled' } });
  // Notify
  const io = req.app.get('io');
  if (io) io.to(invite.toUserId).emit('invite:cancelled', { inviteId });
  // Log
  await prisma.auditLog.create({ data: { userId, action: 'INVITE_CANCELLED', details: JSON.stringify({ inviteId }) } });
  res.json({ success: true, message: t('invite.cancelled', lang) });
}));

// List invites for user
router.get('/list', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const sent = await prisma.invite.findMany({ where: { fromUserId: userId }, orderBy: { createdAt: 'desc' } });
  const received = await prisma.invite.findMany({ where: { toUserId: userId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: { sent, received } });
}));

// Admin: list all invites
router.get('/admin', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const invites = await prisma.invite.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: invites });
}));

// Admin: cancel/refund invite
router.post('/admin/cancel', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { inviteId } = req.body;
  const invite = await prisma.invite.findUnique({ where: { id: inviteId } });
  if (!invite) return res.status(404).json({ error: t('invite.not_found') });
  await prisma.invite.update({ where: { id: inviteId }, data: { status: 'cancelled' } });
  // TODO: Refund logic if needed
  // Log
  await prisma.auditLog.create({ data: { action: 'ADMIN_INVITE_CANCEL', details: JSON.stringify({ inviteId }) } });
  res.json({ success: true, message: t('invite.admin_action') });
}));

// Admin: delete invite
router.post('/admin/delete', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { inviteId } = req.body;
  await prisma.invite.delete({ where: { id: inviteId } });
  await prisma.auditLog.create({ data: { action: 'ADMIN_INVITE_DELETE', details: JSON.stringify({ inviteId }) } });
  res.json({ success: true, message: t('invite.admin_action') });
}));

module.exports = router; 