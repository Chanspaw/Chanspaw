const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  hashPassword,
  verifyPassword,
  generateToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  validatePassword,
  validateEmail,
  validateUsername
} = require('../utils/auth');

const router = express.Router();
const prisma = new PrismaClient();

function pad(num) {
  return String(num).padStart(3, '0');
}

async function generateUserId(prisma) {
  const users = await prisma.user.findMany({
    where: { id: { startsWith: 'CHS-' } },
    select: { id: true }
  });
  const numbers = users
    .map(u => {
      const match = u.id.match(/^CHS-(\d{3})-USR$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(n => n !== null)
    .sort((a, b) => a - b);
  let next = 1;
  while (numbers.includes(next)) next++;
  return `CHS-${pad(next)}-USR`;
}

// Route d'inscription
router.post('/register', asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, dateOfBirth } = req.body;

  // Validation des données
  if (!username || !email || !password || !dateOfBirth) {
    return res.status(400).json({
      success: false,
      error: 'Username, email, password, and date of birth are required'
    });
  }

  // Validation de l'âge (18+)
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  let actualAge = age;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    actualAge = age - 1;
  }
  
  if (actualAge < 18) {
    return res.status(400).json({
      success: false,
      error: 'You must be at least 18 years old to register'
    });
  }

  // Validation du mot de passe
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Password validation failed',
      details: passwordValidation.errors
    });
  }

  // Validation de l'email
  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  // Validation du nom d'utilisateur
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Username validation failed',
      details: usernameValidation.errors
    });
  }

  // Vérifier si l'utilisateur existe déjà
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    }
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'User already exists with this email or username'
    });
  }

  // Hasher le mot de passe
  const hashedPassword = await hashPassword(password);

  // Créer l'utilisateur
  const id = await generateUserId(prisma);

  const user = await prisma.user.create({
    data: {
      id,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName || null,
      lastName: lastName || null,
      dateOfBirth: new Date(dateOfBirth),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      real_balance: 0,
      virtual_balance: 0,
      isAdmin: false,
      isVerified: true,
      isActive: true
    },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      avatar: true,
      real_balance: true,
      virtual_balance: true,
      isAdmin: true,
      isVerified: true,
      isActive: true,
      createdAt: true
    }
  });

  // Générer le token
  const accessToken = generateToken(user.id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      accessToken
    }
  });
}));

// Route pour envoyer l'email de vérification
router.post('/send-email-verification', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  // Trouver l'utilisateur
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  // Vérifier si l'email est déjà vérifié
  if (user.isVerified) {
    return res.status(400).json({
      success: false,
      error: 'Email is already verified'
    });
  }

  // Générer le token de vérification
  const verificationToken = generateEmailVerificationToken();

  // Sauvegarder le token dans la base de données
  await prisma.emailVerification.create({
    data: {
      userId: user.id,
      email: user.email,
      token: verificationToken,
      type: 'email_verification',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 heures
      used: false
    }
  });

  // En production, envoyer l'email ici
  console.log(`Verification email sent to ${email} with token: ${verificationToken}`);

  res.json({
    success: true,
    message: 'Verification email sent successfully',
    token: verificationToken // For testing only - remove in production
  });
}));

// Route pour vérifier l'email
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Verification token is required'
    });
  }

  // Trouver la vérification
  const verification = await prisma.emailVerification.findFirst({
    where: {
      token: token,
      type: 'email_verification',
      used: false,
      expiresAt: {
        gt: new Date()
      }
    },
    include: {
      user: true
    }
  });

  if (!verification) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired verification token'
    });
  }

  // Marquer la vérification comme utilisée
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: {
      used: true,
      usedAt: new Date()
    }
  });

  // Marquer l'utilisateur comme vérifié
  await prisma.user.update({
    where: { id: verification.userId },
    data: {
      isVerified: true,
      updatedAt: new Date()
    }
  });

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
}));

// Route de connexion
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation des données
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  // Trouver l'utilisateur
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Vérifier le statut du compte
  if (!user.isActive) {
    return res.status(403).json({
      success: false,
      error: 'Account is not active'
    });
  }

  // Vérifier le mot de passe
  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Note: Email verification is not required for login in this version
  // Users can log in even if their email is not verified

  // Générer le token
  const accessToken = generateToken(user.id);

  // Mettre à jour la dernière connexion
  await prisma.user.update({
    where: { id: user.id },
    data: { updatedAt: new Date() }
  });

  // On successful login:
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'login',
      details: 'User logged in',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        real_balance: user.real_balance,
        virtual_balance: user.virtual_balance,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        isActive: user.isActive
      },
      accessToken
    }
  });
}));

// Route de déconnexion
router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    // Supprimer la session
    await prisma.session.deleteMany({
      where: { refreshToken }
    });
  }

  // On successful logout:
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'logout',
      details: 'User logged out',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
  });

  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

// Route de rafraîchissement de token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Refresh token is required'
    });
  }

  // Vérifier le token de rafraîchissement
  const decoded = verifyRefreshToken(refreshToken);

  // Vérifier si la session existe
  const session = await prisma.session.findFirst({
    where: {
      refreshToken,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          real_balance: true,
          virtual_balance: true,
          isAdmin: true,
          isVerified: true,
          isActive: true
        }
      }
    }
  });

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }

  // Vérifier le statut de l'utilisateur
  if (!session.user.isActive) {
    return res.status(403).json({
      success: false,
      error: 'Account is not active'
    });
  }

  // Générer un nouveau token d'accès
  const newAccessToken = generateToken(session.user.id);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken: newAccessToken,
      user: session.user
    }
  });
}));

// Route de demande de réinitialisation de mot de passe
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    // Pour des raisons de sécurité, ne pas révéler si l'email existe
    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });
  }

  // Générer un token de réinitialisation
  const resetToken = generatePasswordResetToken(user.id);

  // Ici, vous enverriez un email avec le token
  // Pour l'instant, on retourne juste le token
  console.log('Password reset token:', resetToken);

  res.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent'
  });
}));

// Route de réinitialisation de mot de passe
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Token and new password are required'
    });
  }

  // Validation du nouveau mot de passe
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      success: false,
      error: 'Password validation failed',
      details: passwordValidation.errors
    });
  }

  try {
    const decoded = verifyPasswordResetToken(token);
    
    // Hasher le nouveau mot de passe
    const hashedPassword = await hashPassword(newPassword);

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { 
        password: hashedPassword,
        passwordChangedAt: new Date()
      }
    });

    // Supprimer toutes les sessions existantes
    await prisma.session.deleteMany({
      where: { userId: decoded.userId }
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid or expired reset token'
    });
  }
}));

// Route de vérification du token
router.get('/verify', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    const { verifyToken } = require('../utils/auth');
    const decoded = verifyToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        real_balance: true,
        virtual_balance: true,
        isAdmin: true,
        isVerified: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}));

module.exports = router; 