const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Générer un hash de mot de passe
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Vérifier un mot de passe
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Générer un token JWT
const generateToken = (userId, expiresIn = null) => {
  const secret = process.env.JWT_SECRET;
  const options = {
    expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'chanspaw-api',
    audience: 'chanspaw-users'
  };

  return jwt.sign(
    { 
      userId,
      iat: Math.floor(Date.now() / 1000)
    },
    secret,
    options
  );
};

// Vérifier un token JWT
const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET;
    return jwt.verify(token, secret);
  } catch (error) {
    throw error;
  }
};

// Générer un token de rafraîchissement
const generateRefreshToken = (userId) => {
  const secret = process.env.JWT_SECRET + '_refresh';
  return jwt.sign(
    { 
      userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    },
    secret,
    { expiresIn: '30d' }
  );
};

// Vérifier un token de rafraîchissement
const verifyRefreshToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET + '_refresh';
    return jwt.verify(token, secret);
  } catch (error) {
    throw error;
  }
};

// Générer un token de vérification d'email
const generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Vérifier un token de vérification d'email
const verifyEmailVerificationToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET + '_email';
    return jwt.verify(token, secret);
  } catch (error) {
    throw error;
  }
};

// Générer un token de réinitialisation de mot de passe
const generatePasswordResetToken = (userId) => {
  const secret = process.env.JWT_SECRET + '_password_reset';
  return jwt.sign(
    { 
      userId,
      type: 'password_reset',
      iat: Math.floor(Date.now() / 1000)
    },
    secret,
    { expiresIn: '1h' }
  );
};

// Vérifier un token de réinitialisation de mot de passe
const verifyPasswordResetToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET + '_password_reset';
    return jwt.verify(token, secret);
  } catch (error) {
    throw error;
  }
};

// Générer un code de vérification à 6 chiffres
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Générer un token sécurisé pour les sessions
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Valider un mot de passe
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Valider un email
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Valider un nom d'utilisateur
const validateUsername = (username) => {
  const minLength = 3;
  const maxLength = 20;
  const usernameRegex = /^[a-zA-Z0-9_]+$/;

  const errors = [];

  if (username.length < minLength) {
    errors.push(`Username must be at least ${minLength} characters long`);
  }
  if (username.length > maxLength) {
    errors.push(`Username must be no more than ${maxLength} characters long`);
  }
  if (!usernameRegex.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateVerificationCode,
  generateSessionToken,
  validatePassword,
  validateEmail,
  validateUsername
}; 