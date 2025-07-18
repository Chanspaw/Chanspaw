const { PrismaClient } = require('@prisma/client');
const AuditService = require('./auditService');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();

class ContentService {
  /**
   * Create new content
   * @param {Object} contentData - Content data
   * @param {string} authorId - Author ID
   */
  static async createContent(contentData, authorId) {
    try {
      const content = await prisma.content.create({
        data: {
          title: contentData.title,
          content: contentData.content,
          type: contentData.type,
          status: contentData.status || 'draft',
          authorId,
          tags: contentData.tags || [],
          metadata: contentData.metadata || {},
          publishedAt: contentData.status === 'published' ? new Date() : null,
          expiresAt: contentData.expiresAt ? new Date(contentData.expiresAt) : null
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });

      // Create initial version
      await prisma.contentVersion.create({
        data: {
          contentId: content.id,
          version: 1,
          title: content.title,
          content: content.content,
          changes: 'Initial version',
          createdBy: authorId
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: authorId,
        action: 'content_created',
        resourceType: 'content',
        resourceId: content.id,
        details: {
          title: content.title,
          type: content.type,
          status: content.status
        },
        success: true
      });

      return content;
    } catch (error) {
      console.error('❌ Error creating content:', error);
      throw error;
    }
  }

  /**
   * Update content
   * @param {string} contentId - Content ID
   * @param {Object} contentData - Updated content data
   * @param {string} updatedBy - User ID who updated the content
   */
  static async updateContent(contentId, contentData, updatedBy) {
    try {
      const existingContent = await prisma.content.findUnique({
        where: { id: contentId },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
      });

      if (!existingContent) {
        throw new Error('Content not found');
      }

      const newVersion = existingContent.versions[0]?.version + 1 || 1;

      // Create new version
      await prisma.contentVersion.create({
        data: {
          contentId,
          version: newVersion,
          title: contentData.title,
          content: contentData.content,
          changes: contentData.changes || 'Content updated',
          createdBy: updatedBy
        }
      });

      // Update content
      const updatedContent = await prisma.content.update({
        where: { id: contentId },
        data: {
          title: contentData.title,
          content: contentData.content,
          type: contentData.type,
          status: contentData.status,
          tags: contentData.tags,
          metadata: contentData.metadata,
          publishedAt: contentData.status === 'published' && !existingContent.publishedAt ? new Date() : existingContent.publishedAt,
          expiresAt: contentData.expiresAt ? new Date(contentData.expiresAt) : null,
          updatedAt: new Date()
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          versions: {
            orderBy: { version: 'desc' },
            take: 5
          }
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: updatedBy,
        action: 'content_updated',
        resourceType: 'content',
        resourceId: contentId,
        details: {
          title: updatedContent.title,
          version: newVersion,
          changes: contentData.changes
        },
        success: true
      });

      return updatedContent;
    } catch (error) {
      console.error('❌ Error updating content:', error);
      throw error;
    }
  }

  /**
   * Delete content
   * @param {string} contentId - Content ID
   * @param {string} deletedBy - User ID who deleted the content
   */
  static async deleteContent(contentId, deletedBy) {
    try {
      const content = await prisma.content.findUnique({
        where: { id: contentId }
      });

      if (!content) {
        throw new Error('Content not found');
      }

      // Soft delete - mark as archived
      const deletedContent = await prisma.content.update({
        where: { id: contentId },
        data: {
          status: 'archived',
          updatedAt: new Date()
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: deletedBy,
        action: 'content_deleted',
        resourceType: 'content',
        resourceId: contentId,
        details: {
          title: content.title,
          type: content.type
        },
        success: true
      });

      return deletedContent;
    } catch (error) {
      console.error('❌ Error deleting content:', error);
      throw error;
    }
  }

  /**
   * Get content by ID
   * @param {string} contentId - Content ID
   */
  static async getContentById(contentId) {
    try {
      return await prisma.content.findUnique({
        where: { id: contentId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          versions: {
            orderBy: { version: 'desc' },
            take: 10
          },
          comments: {
            where: { status: 'approved' },
            include: {
              author: {
                select: {
                  id: true,
                  username: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      });
    } catch (error) {
      console.error('❌ Error getting content by ID:', error);
      throw error;
    }
  }

  /**
   * Get content list with filters
   * @param {Object} filters - Filter options
   */
  static async getContentList(filters = {}) {
    try {
      const {
        type,
        status,
        authorId,
        tags,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const where = {};

      if (type) where.type = type;
      if (status) where.status = status;
      if (authorId) where.authorId = authorId;
      if (tags && tags.length > 0) where.tags = { hasSome: tags };
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [content, total] = await Promise.all([
        prisma.content.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                email: true
              }
            },
            _count: {
              select: {
                versions: true,
                comments: true
              }
            }
          }
        }),
        prisma.content.count({ where })
      ]);

      return {
        content,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting content list:', error);
      throw error;
    }
  }

  /**
   * Publish content
   * @param {string} contentId - Content ID
   * @param {string} publishedBy - User ID who published the content
   */
  static async publishContent(contentId, publishedBy) {
    try {
      const content = await prisma.content.update({
        where: { id: contentId },
        data: {
          status: 'published',
          publishedAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: publishedBy,
        action: 'content_published',
        resourceType: 'content',
        resourceId: contentId,
        details: {
          title: content.title,
          type: content.type
        },
        success: true
      });

      return content;
    } catch (error) {
      console.error('❌ Error publishing content:', error);
      throw error;
    }
  }

  /**
   * Unpublish content
   * @param {string} contentId - Content ID
   * @param {string} unpublishedBy - User ID who unpublished the content
   */
  static async unpublishContent(contentId, unpublishedBy) {
    try {
      const content = await prisma.content.update({
        where: { id: contentId },
        data: {
          status: 'draft',
          publishedAt: null,
          updatedAt: new Date()
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: unpublishedBy,
        action: 'content_unpublished',
        resourceType: 'content',
        resourceId: contentId,
        details: {
          title: content.title,
          type: content.type
        },
        success: true
      });

      return content;
    } catch (error) {
      console.error('❌ Error unpublishing content:', error);
      throw error;
    }
  }

  /**
   * Add comment to content
   * @param {string} contentId - Content ID
   * @param {string} authorId - Comment author ID
   * @param {string} comment - Comment text
   */
  static async addComment(contentId, authorId, comment) {
    try {
      const contentComment = await prisma.contentComment.create({
        data: {
          contentId,
          authorId,
          comment,
          status: 'pending'
        },
        include: {
          author: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      return contentComment;
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      throw error;
    }
  }

  /**
   * Approve/reject comment
   * @param {string} commentId - Comment ID
   * @param {string} status - 'approved' or 'rejected'
   * @param {string} moderatedBy - Moderator ID
   */
  static async moderateComment(commentId, status, moderatedBy) {
    try {
      const comment = await prisma.contentComment.update({
        where: { id: commentId },
        data: {
          status,
          updatedAt: new Date()
        },
        include: {
          content: {
            select: {
              id: true,
              title: true
            }
          },
          author: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: moderatedBy,
        action: 'comment_moderated',
        resourceType: 'content_comment',
        resourceId: commentId,
        details: {
          status,
          contentTitle: comment.content.title,
          authorUsername: comment.author.username
        },
        success: true
      });

      return comment;
    } catch (error) {
      console.error('❌ Error moderating comment:', error);
      throw error;
    }
  }

  /**
   * Create content template
   * @param {Object} templateData - Template data
   * @param {string} createdBy - Creator ID
   */
  static async createTemplate(templateData, createdBy) {
    try {
      const template = await prisma.contentTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          template: templateData.template,
          variables: templateData.variables || {},
          type: templateData.type,
          isActive: templateData.isActive !== false
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: createdBy,
        action: 'template_created',
        resourceType: 'content_template',
        resourceId: template.id,
        details: {
          name: template.name,
          type: template.type
        },
        success: true
      });

      return template;
    } catch (error) {
      console.error('❌ Error creating template:', error);
      throw error;
    }
  }

  /**
   * Get content templates
   * @param {Object} filters - Filter options
   */
  static async getTemplates(filters = {}) {
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

      return await prisma.contentTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error getting templates:', error);
      throw error;
    }
  }

  /**
   * Upload media asset
   * @param {Object} fileData - File data
   * @param {string} uploadedBy - Uploader ID
   */
  static async uploadMedia(fileData, uploadedBy) {
    try {
      const { originalname, mimetype, size, buffer } = fileData;

      // Generate unique filename
      const fileExtension = path.extname(originalname);
      const filename = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
      
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Save file
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, buffer);

      // Create media asset record
      const mediaAsset = await prisma.mediaAsset.create({
        data: {
          filename,
          originalName: originalname,
          mimeType: mimetype,
          size,
          path: filePath,
          url: `/uploads/${filename}`,
          altText: fileData.altText,
          caption: fileData.caption,
          tags: fileData.tags || [],
          uploadedBy,
          isPublic: fileData.isPublic || false
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true
            }
          }
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: uploadedBy,
        action: 'media_uploaded',
        resourceType: 'media_asset',
        resourceId: mediaAsset.id,
        details: {
          filename: mediaAsset.filename,
          originalName: mediaAsset.originalName,
          size: mediaAsset.size
        },
        success: true
      });

      return mediaAsset;
    } catch (error) {
      console.error('❌ Error uploading media:', error);
      throw error;
    }
  }

  /**
   * Get media assets
   * @param {Object} filters - Filter options
   */
  static async getMediaAssets(filters = {}) {
    try {
      const {
        uploadedBy,
        tags,
        isPublic,
        search,
        page = 1,
        limit = 20
      } = filters;

      const where = {};

      if (uploadedBy) where.uploadedBy = uploadedBy;
      if (isPublic !== undefined) where.isPublic = isPublic;
      if (tags && tags.length > 0) where.tags = { hasSome: tags };
      if (search) {
        where.OR = [
          { originalName: { contains: search, mode: 'insensitive' } },
          { altText: { contains: search, mode: 'insensitive' } },
          { caption: { contains: search, mode: 'insensitive' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [assets, total] = await Promise.all([
        prisma.mediaAsset.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }),
        prisma.mediaAsset.count({ where })
      ]);

      return {
        assets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting media assets:', error);
      throw error;
    }
  }

  /**
   * Delete media asset
   * @param {string} assetId - Asset ID
   * @param {string} deletedBy - User ID who deleted the asset
   */
  static async deleteMediaAsset(assetId, deletedBy) {
    try {
      const asset = await prisma.mediaAsset.findUnique({
        where: { id: assetId }
      });

      if (!asset) {
        throw new Error('Media asset not found');
      }

      // Delete file from filesystem
      try {
        await fs.unlink(asset.path);
      } catch (fileError) {
        console.warn('⚠️ Could not delete file from filesystem:', fileError.message);
      }

      // Delete from database
      await prisma.mediaAsset.delete({
        where: { id: assetId }
      });

      // Log audit
      await AuditService.logAction({
        adminId: deletedBy,
        action: 'media_deleted',
        resourceType: 'media_asset',
        resourceId: assetId,
        details: {
          filename: asset.filename,
          originalName: asset.originalName
        },
        success: true
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting media asset:', error);
      throw error;
    }
  }

  /**
   * Get content statistics
   */
  static async getContentStats() {
    try {
      const [
        totalContent,
        publishedContent,
        draftContent,
        archivedContent,
        totalComments,
        pendingComments,
        totalTemplates,
        activeTemplates,
        totalMedia,
        mediaSize
      ] = await Promise.all([
        prisma.content.count(),
        prisma.content.count({ where: { status: 'published' } }),
        prisma.content.count({ where: { status: 'draft' } }),
        prisma.content.count({ where: { status: 'archived' } }),
        prisma.contentComment.count(),
        prisma.contentComment.count({ where: { status: 'pending' } }),
        prisma.contentTemplate.count(),
        prisma.contentTemplate.count({ where: { isActive: true } }),
        prisma.mediaAsset.count(),
        prisma.mediaAsset.aggregate({
          _sum: { size: true }
        })
      ]);

      const contentByType = await prisma.content.groupBy({
        by: ['type'],
        _count: { id: true }
      });

      return {
        totalContent,
        publishedContent,
        draftContent,
        archivedContent,
        totalComments,
        pendingComments,
        totalTemplates,
        activeTemplates,
        totalMedia,
        mediaSize: mediaSize._sum.size || 0,
        contentByType: contentByType.map(item => ({
          type: item.type,
          count: item._count.id
        }))
      };
    } catch (error) {
      console.error('❌ Error getting content stats:', error);
      throw error;
    }
  }
}

module.exports = ContentService;
