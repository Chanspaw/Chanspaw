const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// List all content (optionally filter by type/status)
router.get('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  const where = {};
  if (type) where.type = type;
  if (status) where.status = status;
  const contents = await prisma.content.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: contents });
}));

// Get single content by id
router.get('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const content = await prisma.content.findUnique({
    where: { id: req.params.id },
    include: { versions: { orderBy: { createdAt: 'desc' } } }
  });
  if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
  res.json({ success: true, data: content });
}));

// Create new content
router.post('/', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { type, title, content, mediaUrl, status, publishAt, expireAt, language } = req.body;
  const authorId = req.user.id;
  const tags = req.body.tags || [];
  const newContent = await prisma.content.create({
    data: { type, title, content, mediaUrl, status, publishAt, expireAt, authorId, tags, language }
  });
  res.json({ success: true, data: newContent });
}));

// Update content (with versioning)
router.put('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { title, content, mediaUrl, status, publishAt, expireAt } = req.body;
  // Save previous version
  const prev = await prisma.content.findUnique({ where: { id: req.params.id } });
  if (prev) {
    await prisma.contentVersion.create({
      data: {
        contentId: prev.id,
        title: prev.title,
        contentText: prev.content,
        mediaUrl: prev.mediaUrl
      }
    });
  }
  // Update content
  const updated = await prisma.content.update({
    where: { id: req.params.id },
    data: { title, content, mediaUrl, status, publishAt, expireAt }
  });
  res.json({ success: true, data: updated });
}));

// Delete content
router.delete('/:id', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  await prisma.content.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

// Rollback to a previous version
router.post('/:id/rollback/:versionId', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const version = await prisma.contentVersion.findUnique({ where: { id: req.params.versionId } });
  if (!version) return res.status(404).json({ success: false, message: 'Version not found' });
  const updated = await prisma.content.update({
    where: { id: req.params.id },
    data: {
      title: version.title,
      content: version.contentText,
      mediaUrl: version.mediaUrl
    }
  });
  res.json({ success: true, data: updated });
}));

module.exports = router; 