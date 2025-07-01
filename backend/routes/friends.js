const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();
const prisma = new PrismaClient();

// Send a friend request
router.post('/request', asyncHandler(async (req, res) => {
  const { receiverId } = req.body;
  if (!receiverId || receiverId === req.user.id) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  
  // Check if user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: receiverId }
  });
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Check if already friends
  const alreadyFriend = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: req.user.id, friendId: receiverId },
        { userId: receiverId, friendId: req.user.id }
      ]
    }
  });
  if (alreadyFriend) {
    return res.status(409).json({ error: 'Already friends' });
  }
  
  // Check if request already exists
  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: req.user.id, receiverId: receiverId },
        { senderId: receiverId, receiverId: req.user.id }
      ],
      status: 'PENDING'
    }
  });
  if (existingRequest) {
    return res.status(409).json({ error: 'Friend request already exists' });
  }
  
  // Create request
  const request = await prisma.friendRequest.create({
    data: {
      senderId: req.user.id,
      receiverId: receiverId,
      status: 'PENDING'
    }
  });
  
  res.status(201).json({ 
    success: true,
    message: 'Friend request sent successfully',
    data: { request }
  });
}));

// Accept a friend request
router.post('/accept/:requestId', asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });
  
  if (!request || request.receiverId !== req.user.id || request.status !== 'PENDING') {
    return res.status(404).json({ error: 'Request not found' });
  }
  
  await prisma.$transaction([
    prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' }
    }),
    prisma.friendship.createMany({
      data: [
        { userId: request.senderId, friendId: request.receiverId },
        { userId: request.receiverId, friendId: request.senderId }
      ],
      skipDuplicates: true
    })
  ]);
  
  res.json({ 
    success: true,
    message: 'Friend request accepted' 
  });
}));

// Reject a friend request
router.post('/reject/:requestId', asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  
  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });
  
  if (!request || request.receiverId !== req.user.id || request.status !== 'PENDING') {
    return res.status(404).json({ error: 'Request not found' });
  }
  
  await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: 'REJECTED' }
  });
  
  res.json({ 
    success: true,
    message: 'Friend request rejected' 
  });
}));

// Remove a friend
router.delete('/remove/:friendId', asyncHandler(async (req, res) => {
  const { friendId } = req.params;
  
  // Check if friendship exists
  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: req.user.id, friendId: friendId },
        { userId: friendId, friendId: req.user.id }
      ]
    }
  });
  
  if (!friendship) {
    return res.status(404).json({ error: 'Friendship not found' });
  }
  
  // Remove both friendship records
  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { userId: req.user.id, friendId: friendId },
        { userId: friendId, friendId: req.user.id }
      ]
    }
  });
  
  res.json({ 
    success: true,
    message: 'Friend removed successfully' 
  });
}));

// List friends
router.get('/list', asyncHandler(async (req, res) => {
  const friendships = await prisma.friendship.findMany({
    where: { userId: req.user.id },
    include: {
      friend: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true,
          createdAt: true
        }
      }
    }
  });
  
  const friends = friendships.map(f => ({
    id: f.friend.id,
    username: f.friend.username,
    avatar: f.friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.friend.username}`,
    isOnline: f.friend.isActive,
    lastLogin: f.friend.createdAt
  }));
  
  res.json({ 
    success: true,
    data: { friends } 
  });
}));

// Get received friend requests
router.get('/requests/received', asyncHandler(async (req, res) => {
  const requests = await prisma.friendRequest.findMany({
    where: {
      receiverId: req.user.id,
      status: 'PENDING'
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  const formattedRequests = requests.map(r => ({
    id: r.id,
    sender: {
      id: r.sender.id,
      username: r.sender.username,
      avatar: r.sender.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.sender.username}`,
      isOnline: r.sender.isActive
    },
    message: r.message,
    createdAt: r.createdAt
  }));
  
  res.json({ 
    success: true,
    data: { requests: formattedRequests } 
  });
}));

// Search users
router.get('/search', asyncHandler(async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.length < 3) {
    return res.status(400).json({ error: 'Search query must be at least 3 characters' });
  }
  
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: query } },
        { id: { contains: query } }
      ],
      id: { not: req.user.id }, // Exclude current user
      isActive: true
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      isActive: true,
      createdAt: true
    },
    take: 10
  });
  
  const formattedUsers = users.map(u => ({
    id: u.id,
    username: u.username,
    avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,
    status: u.isActive ? 'online' : 'offline',
    createdAt: u.createdAt
  }));
  
  res.json({ 
    success: true,
    data: { users: formattedUsers } 
  });
}));

// Get sent friend requests
router.get('/requests/sent', asyncHandler(async (req, res) => {
  const requests = await prisma.friendRequest.findMany({
    where: {
      senderId: req.user.id,
      status: 'PENDING'
    },
    include: {
      receiver: {
        select: {
          id: true,
          username: true,
          avatar: true,
          isActive: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  const formattedRequests = requests.map(r => ({
    id: r.id,
    receiver: {
      id: r.receiver.id,
      username: r.receiver.username,
      avatar: r.receiver.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.receiver.username}`,
      isOnline: r.receiver.isActive
    },
    message: r.message,
    createdAt: r.createdAt
  }));
  
  res.json({ 
    success: true,
    data: { requests: formattedRequests } 
  });
}));

module.exports = router; 