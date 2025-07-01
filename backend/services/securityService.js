const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

class SecurityService {
  /**
   * Generate MFA secret for admin
   */
  static async generateMFASecret(adminId) {
    try {
      const secret = speakeasy.generateSecret({
        name: 'Chanspaw Admin',
        issuer: 'Chanspaw Gaming Platform',
        length: 32
      });

      // Store the secret temporarily (in production, encrypt this)
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        otpauthUrl: secret.otpauth_url
      };
    } catch (error) {
      console.error('❌ Failed to generate MFA secret:', error);
      throw error;
    }
  }

  /**
   * Verify MFA token
   */
  static async verifyMFAToken(secret, token) {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps (60 seconds) for clock skew
      });
    } catch (error) {
      console.error('❌ Failed to verify MFA token:', error);
      return false;
    }
  }

  /**
   * Create admin session
   */
  static async createAdminSession(adminId, ip, userAgent) {
    try {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const session = await prisma.adminSession.create({
        data: {
          adminId,
          sessionToken,
          ip,
          userAgent,
          expiresAt
        }
      });

      return session;
    } catch (error) {
      console.error('❌ Failed to create admin session:', error);
      throw error;
    }
  }

  /**
   * Validate admin session
   */
  static async validateAdminSession(sessionToken) {
    try {
      const session = await prisma.adminSession.findUnique({
        where: { sessionToken },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              email: true,
              isAdmin: true,
              isActive: true
            }
          }
        }
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return null;
      }

      // Update last activity
      await prisma.adminSession.update({
        where: { id: session.id },
        data: { lastActivity: new Date() }
      });

      return session;
    } catch (error) {
      console.error('❌ Failed to validate admin session:', error);
      return null;
    }
  }

  /**
   * Invalidate admin session
   */
  static async invalidateAdminSession(sessionToken) {
    try {
      await prisma.adminSession.update({
        where: { sessionToken },
        data: { isActive: false }
      });
      return true;
    } catch (error) {
      console.error('❌ Failed to invalidate admin session:', error);
      return false;
    }
  }

  /**
   * Invalidate all sessions for an admin
   */
  static async invalidateAllAdminSessions(adminId) {
    try {
      await prisma.adminSession.updateMany({
        where: { adminId },
        data: { isActive: false }
      });
      return true;
    } catch (error) {
      console.error('❌ Failed to invalidate all admin sessions:', error);
      return false;
    }
  }

  /**
   * Log admin login attempt
   */
  static async logLoginAttempt(email, ip, userAgent, success, failureReason = null) {
    try {
      await prisma.adminLoginAttempt.create({
        data: {
          email,
          ip,
          userAgent,
          success,
          failureReason
        }
      });
    } catch (error) {
      console.error('❌ Failed to log login attempt:', error);
    }
  }

  /**
   * Check for suspicious login activity
   */
  static async checkSuspiciousActivity(ip, email) {
    try {
      const recentAttempts = await prisma.adminLoginAttempt.findMany({
        where: {
          OR: [
            { ip },
            { email }
          ],
          createdAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const failedAttempts = recentAttempts.filter(attempt => !attempt.success);
      
      // Block if more than 5 failed attempts in 15 minutes
      if (failedAttempts.length >= 5) {
        return {
          suspicious: true,
          reason: 'Too many failed login attempts',
          blockedUntil: new Date(Date.now() + 30 * 60 * 1000) // Block for 30 minutes
        };
      }

      // Check for rapid login attempts
      if (recentAttempts.length >= 10) {
        return {
          suspicious: true,
          reason: 'Too many login attempts',
          blockedUntil: new Date(Date.now() + 15 * 60 * 1000) // Block for 15 minutes
        };
      }

      return { suspicious: false };
    } catch (error) {
      console.error('❌ Failed to check suspicious activity:', error);
      return { suspicious: false };
    }
  }

  /**
   * Get admin sessions
   */
  static async getAdminSessions(adminId) {
    try {
      return await prisma.adminSession.findMany({
        where: { adminId },
        orderBy: { lastActivity: 'desc' }
      });
    } catch (error) {
      console.error('❌ Failed to get admin sessions:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions() {
    try {
      const result = await prisma.adminSession.updateMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        },
        data: {
          isActive: false
        }
      });

      console.log(`🧹 Cleaned up ${result.count} expired admin sessions`);
      return result.count;
    } catch (error) {
      console.error('❌ Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Get security statistics
   */
  static async getSecurityStats() {
    try {
      const [
        totalSessions,
        activeSessions,
        todayLoginAttempts,
        failedLoginAttempts,
        suspiciousActivities
      ] = await Promise.all([
        prisma.adminSession.count(),
        prisma.adminSession.count({ where: { isActive: true } }),
        prisma.adminLoginAttempt.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.adminLoginAttempt.count({
          where: { success: false }
        }),
        prisma.adminLoginAttempt.count({
          where: {
            success: false,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          }
        })
      ]);

      return {
        totalSessions,
        activeSessions,
        todayLoginAttempts,
        failedLoginAttempts,
        suspiciousActivities,
        securityScore: this.calculateSecurityScore({
          totalSessions,
          activeSessions,
          todayLoginAttempts,
          failedLoginAttempts
        })
      };
    } catch (error) {
      console.error('❌ Failed to get security stats:', error);
      throw error;
    }
  }

  /**
   * Calculate security score (0-100)
   */
  static calculateSecurityScore(stats) {
    let score = 100;

    // Deduct points for failed login attempts
    if (stats.failedLoginAttempts > 0) {
      score -= Math.min(30, stats.failedLoginAttempts * 2);
    }

    // Deduct points for too many active sessions
    if (stats.activeSessions > 10) {
      score -= Math.min(20, (stats.activeSessions - 10) * 2);
    }

    // Deduct points for high login attempts
    if (stats.todayLoginAttempts > 50) {
      score -= Math.min(25, (stats.todayLoginAttempts - 50));
    }

    return Math.max(0, Math.round(score));
  }
}

module.exports = SecurityService; 