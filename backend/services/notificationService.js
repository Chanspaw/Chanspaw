const { PrismaClient } = require('@prisma/client');
const AuditService = require('./auditService');

const prisma = new PrismaClient();

class NotificationService {
  /**
   * Send mass notification
   * @param {Object} notificationData - Notification data
   * @param {string} sentBy - Admin ID who sent the notification
   */
  static async sendMassNotification(notificationData, sentBy) {
    try {
      const {
        title,
        message,
        type = 'general',
        priority = 'normal',
        targetUsers = 'all', // 'all', 'specific', 'filtered'
        userIds = [],
        filters = {},
        scheduledAt = null,
        expiresAt = null,
        channels = ['in_app'], // 'in_app', 'email', 'sms', 'push'
        metadata = {}
      } = notificationData;

      // Create notification campaign
      const campaign = await prisma.notificationCampaign.create({
        data: {
          title,
          message,
          type,
          priority,
          targetUsers,
          filters: filters,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          channels,
          metadata,
          status: scheduledAt ? 'scheduled' : 'active',
          sentBy
        }
      });

      // Get target users
      let targetUserIds = [];
      
      if (targetUsers === 'all') {
        const users = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true }
        });
        targetUserIds = users.map(user => user.id);
      } else if (targetUsers === 'specific' && userIds.length > 0) {
        targetUserIds = userIds;
      } else if (targetUsers === 'filtered') {
        targetUserIds = await this.getFilteredUserIds(filters);
      }

      // Create individual notifications
      const notifications = [];
      const batchSize = 1000;
      
      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = targetUserIds.slice(i, i + batchSize);
        const batchNotifications = batch.map(userId => ({
          userId,
          campaignId: campaign.id,
          title,
          message,
          type,
          priority,
          status: 'pending',
          channels,
          metadata
        }));

        const createdNotifications = await prisma.notification.createMany({
          data: batchNotifications
        });

        notifications.push(...batchNotifications);
      }

      // Log audit
      await AuditService.logAction({
        adminId: sentBy,
        action: 'mass_notification_sent',
        resourceType: 'notification_campaign',
        resourceId: campaign.id,
        details: {
          title,
          type,
          targetUsers,
          recipientCount: targetUserIds.length,
          channels
        },
        success: true
      });

      return {
        campaign,
        notifications: notifications.length,
        recipientCount: targetUserIds.length
      };
    } catch (error) {
      console.error('❌ Error sending mass notification:', error);
      throw error;
    }
  }

  /**
   * Get filtered user IDs based on criteria
   * @param {Object} filters - Filter criteria
   */
  static async getFilteredUserIds(filters) {
    try {
      const {
        isVerified,
        isActive,
        hasBalance,
        minBalance,
        maxBalance,
        registrationDate,
        lastLoginDate,
        userRole,
        gameActivity,
        transactionActivity
      } = filters;

      const where = {};

      if (isVerified !== undefined) where.isVerified = isVerified;
      if (isActive !== undefined) where.isActive = isActive;
      if (userRole) where.roleId = userRole;

      if (hasBalance) {
        where.OR = [
          { real_balance: { gt: 0 } },
          { virtual_balance: { gt: 0 } }
        ];
      }

      if (minBalance !== undefined) {
        where.real_balance = { gte: minBalance };
      }

      if (maxBalance !== undefined) {
        where.real_balance = { ...where.real_balance, lte: maxBalance };
      }

      if (registrationDate) {
        if (registrationDate.start) {
          where.createdAt = { gte: new Date(registrationDate.start) };
        }
        if (registrationDate.end) {
          where.createdAt = { ...where.createdAt, lte: new Date(registrationDate.end) };
        }
      }

      if (lastLoginDate) {
        // This would require a lastLogin field in the User model
        // For now, we'll use a placeholder
        console.log('⚠️ Last login filtering not implemented yet');
      }

      if (gameActivity) {
        where.gameResults = {
          some: {
            createdAt: {
              gte: new Date(Date.now() - gameActivity.days * 24 * 60 * 60 * 1000)
            }
          }
        };
      }

      if (transactionActivity) {
        where.transactions = {
          some: {
            createdAt: {
              gte: new Date(Date.now() - transactionActivity.days * 24 * 60 * 60 * 1000)
            }
          }
        };
      }

      const users = await prisma.user.findMany({
        where,
        select: { id: true }
      });

      return users.map(user => user.id);
    } catch (error) {
      console.error('❌ Error getting filtered user IDs:', error);
      return [];
    }
  }

  /**
   * Send notification to specific users
   * @param {string[]} userIds - User IDs
   * @param {Object} notificationData - Notification data
   * @param {string} sentBy - Admin ID who sent the notification
   */
  static async sendNotificationToUsers(userIds, notificationData, sentBy) {
    try {
      const {
        title,
        message,
        type = 'general',
        priority = 'normal',
        channels = ['in_app'],
        metadata = {}
      } = notificationData;

      const notifications = userIds.map(userId => ({
        userId,
        title,
        message,
        type,
        priority,
        status: 'pending',
        channels,
        metadata
      }));

      const createdNotifications = await prisma.notification.createMany({
        data: notifications
      });

      // Log audit
      await AuditService.logAction({
        adminId: sentBy,
        action: 'notification_sent_to_users',
        resourceType: 'notification',
        details: {
          title,
          type,
          recipientCount: userIds.length,
          channels
        },
        success: true
      });

      return {
        notifications: createdNotifications.count,
        recipientCount: userIds.length
      };
    } catch (error) {
      console.error('❌ Error sending notification to users:', error);
      throw error;
    }
  }

  /**
   * Schedule notification
   * @param {Object} notificationData - Notification data
   * @param {string} scheduledBy - Admin ID who scheduled the notification
   */
  static async scheduleNotification(notificationData, scheduledBy) {
    try {
      const {
        title,
        message,
        type = 'general',
        priority = 'normal',
        targetUsers = 'all',
        userIds = [],
        filters = {},
        scheduledAt,
        expiresAt = null,
        channels = ['in_app'],
        metadata = {}
      } = notificationData;

      if (!scheduledAt) {
        throw new Error('Scheduled time is required');
      }

      const campaign = await prisma.notificationCampaign.create({
        data: {
          title,
          message,
          type,
          priority,
          targetUsers,
          filters,
          scheduledAt: new Date(scheduledAt),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          channels,
          metadata,
          status: 'scheduled',
          sentBy: scheduledBy
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: scheduledBy,
        action: 'notification_scheduled',
        resourceType: 'notification_campaign',
        resourceId: campaign.id,
        details: {
          title,
          type,
          scheduledAt,
          targetUsers
        },
        success: true
      });

      return campaign;
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   * @param {string} campaignId - Campaign ID
   * @param {string} cancelledBy - Admin ID who cancelled the notification
   */
  static async cancelScheduledNotification(campaignId, cancelledBy) {
    try {
      const campaign = await prisma.notificationCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: cancelledBy,
        action: 'notification_cancelled',
        resourceType: 'notification_campaign',
        resourceId: campaignId,
        details: {
          title: campaign.title,
          type: campaign.type
        },
        success: true
      });

      return campaign;
    } catch (error) {
      console.error('❌ Error cancelling scheduled notification:', error);
      throw error;
    }
  }

  /**
   * Get notification campaigns
   * @param {Object} filters - Filter options
   */
  static async getNotificationCampaigns(filters = {}) {
    try {
      const {
        status,
        type,
        sentBy,
        search,
        page = 1,
        limit = 20
      } = filters;

      const where = {};

      if (status) where.status = status;
      if (type) where.type = type;
      if (sentBy) where.sentBy = sentBy;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { message: { contains: search, mode: 'insensitive' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [campaigns, total] = await Promise.all([
        prisma.notificationCampaign.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            sentByUser: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            _count: {
              select: {
                notifications: true
              }
            }
          }
        }),
        prisma.notificationCampaign.count({ where })
      ]);

      return {
        campaigns,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting notification campaigns:', error);
      throw error;
    }
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} filters - Filter options
   */
  static async getUserNotifications(userId, filters = {}) {
    try {
      const {
        status,
        type,
        read,
        page = 1,
        limit = 20
      } = filters;

      const where = { userId };

      if (status) where.status = status;
      if (type) where.type = type;
      if (read !== undefined) where.read = read;

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                type: true
              }
            }
          }
        }),
        prisma.notification.count({ where })
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  static async markNotificationAsRead(notificationId, userId) {
    try {
      const notification = await prisma.notification.update({
        where: {
          id: notificationId,
          userId
        },
        data: {
          read: true,
          readAt: new Date()
        }
      });

      return notification;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   * @param {string} userId - User ID
   */
  static async markAllNotificationsAsRead(userId) {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          userId,
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      });

      return result;
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID
   */
  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await prisma.notification.delete({
        where: {
          id: notificationId,
          userId
        }
      });

      return notification;
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats() {
    try {
      const [
        totalCampaigns,
        activeCampaigns,
        scheduledCampaigns,
        totalNotifications,
        unreadNotifications,
        notificationsByType,
        notificationsByStatus,
        deliveryStats
      ] = await Promise.all([
        prisma.notificationCampaign.count(),
        prisma.notificationCampaign.count({ where: { status: 'active' } }),
        prisma.notificationCampaign.count({ where: { status: 'scheduled' } }),
        prisma.notification.count(),
        prisma.notification.count({ where: { read: false } }),
        prisma.notification.groupBy({
          by: ['type'],
          _count: { id: true }
        }),
        prisma.notification.groupBy({
          by: ['status'],
          _count: { id: true }
        }),
        this.getDeliveryStats()
      ]);

      return {
        totalCampaigns,
        activeCampaigns,
        scheduledCampaigns,
        totalNotifications,
        unreadNotifications,
        readRate: totalNotifications > 0 ? ((totalNotifications - unreadNotifications) / totalNotifications * 100).toFixed(2) : 0,
        notificationsByType: notificationsByType.map(item => ({
          type: item.type,
          count: item._count.id
        })),
        notificationsByStatus: notificationsByStatus.map(item => ({
          status: item.status,
          count: item._count.id
        })),
        deliveryStats
      };
    } catch (error) {
      console.error('❌ Error getting notification stats:', error);
      throw error;
    }
  }

  /**
   * Get delivery statistics
   */
  static async getDeliveryStats() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [notifications24h, notifications7d, campaigns24h, campaigns7d] = await Promise.all([
        prisma.notification.count({ where: { createdAt: { gte: oneDayAgo } } }),
        prisma.notification.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.notificationCampaign.count({ where: { createdAt: { gte: oneDayAgo } } }),
        prisma.notificationCampaign.count({ where: { createdAt: { gte: sevenDaysAgo } } })
      ]);

      return {
        notifications24h,
        notifications7d,
        campaigns24h,
        campaigns7d
      };
    } catch (error) {
      console.error('❌ Error getting delivery stats:', error);
      return {};
    }
  }

  /**
   * Process scheduled notifications (to be called by a cron job)
   */
  static async processScheduledNotifications() {
    try {
      const now = new Date();

      // Get scheduled campaigns that are due
      const scheduledCampaigns = await prisma.notificationCampaign.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: { lte: now }
        }
      });

      for (const campaign of scheduledCampaigns) {
        try {
          // Update campaign status
          await prisma.notificationCampaign.update({
            where: { id: campaign.id },
            data: { status: 'active' }
          });

          // Get target users
          let targetUserIds = [];
          
          if (campaign.targetUsers === 'all') {
            const users = await prisma.user.findMany({
              where: { isActive: true },
              select: { id: true }
            });
            targetUserIds = users.map(user => user.id);
          } else if (campaign.targetUsers === 'filtered') {
            targetUserIds = await this.getFilteredUserIds(campaign.filters);
          }

          // Create notifications
          const notifications = targetUserIds.map(userId => ({
            userId,
            campaignId: campaign.id,
            title: campaign.title,
            message: campaign.message,
            type: campaign.type,
            priority: campaign.priority,
            status: 'pending',
            channels: campaign.channels,
            metadata: campaign.metadata
          }));

          await prisma.notification.createMany({
            data: notifications
          });

          console.log(`✅ Processed scheduled campaign: ${campaign.title} (${targetUserIds.length} recipients)`);
        } catch (error) {
          console.error(`❌ Error processing campaign ${campaign.id}:`, error);
        }
      }

      return { processed: scheduledCampaigns.length };
    } catch (error) {
      console.error('❌ Error processing scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Create notification template
   * @param {Object} templateData - Template data
   * @param {string} createdBy - Creator ID
   */
  static async createNotificationTemplate(templateData, createdBy) {
    try {
      const template = await prisma.notificationTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          title: templateData.title,
          message: templateData.message,
          type: templateData.type,
          variables: templateData.variables || {},
          isActive: templateData.isActive !== false,
          createdBy
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: createdBy,
        action: 'notification_template_created',
        resourceType: 'notification_template',
        resourceId: template.id,
        details: {
          name: template.name,
          type: template.type
        },
        success: true
      });

      return template;
    } catch (error) {
      console.error('❌ Error creating notification template:', error);
      throw error;
    }
  }

  /**
   * Get notification templates
   * @param {Object} filters - Filter options
   */
  static async getNotificationTemplates(filters = {}) {
    try {
      const { type, isActive, search } = filters;

      const where = {};

      if (type) where.type = type;
      if (isActive !== undefined) where.isActive = isActive;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      return await prisma.notificationTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          createdByUser: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Error getting notification templates:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
