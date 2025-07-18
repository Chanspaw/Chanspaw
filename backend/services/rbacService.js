const { PrismaClient } = require('@prisma/client');
const AuditService = require('./auditService');

const prisma = new PrismaClient();

class RBACService {
  /**
   * Check if user has permission
   * @param {string} userId - User ID
   * @param {string} permission - Permission name (e.g., 'user:read')
   * @param {string} resource - Resource name (e.g., 'user')
   * @param {string} action - Action name (e.g., 'read')
   */
  static async hasPermission(userId, permission, resource = null, action = null) {
    try {
      // Get user with roles and permissions
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: true
            }
          },
          roleAssignments: {
            where: { isActive: true },
            include: {
              role: {
                include: {
                  permissions: true
                }
              }
            }
          },
          permissionOverrides: {
            where: { 
              expiresAt: {
                gt: new Date()
              }
            }
          }
        }
      });

      if (!user) return false;

      // Check if user is super admin (bypass all checks)
      if (user.isAdmin && user.role?.name === 'super_admin') {
        return true;
      }

      const userPermissions = new Set();

      // Add permissions from primary role
      if (user.role?.permissions) {
        user.role.permissions.forEach(perm => {
          userPermissions.add(perm.name);
        });
      }

      // Add permissions from assigned roles
      user.roleAssignments.forEach(assignment => {
        assignment.role.permissions.forEach(perm => {
          userPermissions.add(perm.name);
        });
      });

      // Check permission overrides (denials take precedence)
      const overrides = user.permissionOverrides.filter(override => {
        const overridePerm = override.permission;
        return (resource && action) 
          ? (overridePerm.resource === resource && overridePerm.action === action)
          : (overridePerm.name === permission);
      });

      // Check for explicit denials first
      const denials = overrides.filter(override => !override.granted);
      if (denials.length > 0) {
        return false;
      }

      // Check for explicit grants
      const grants = overrides.filter(override => override.granted);
      if (grants.length > 0) {
        return true;
      }

      // Check regular permissions
      if (resource && action) {
        const permissionName = `${resource}:${action}`;
        return userPermissions.has(permissionName);
      }

      return userPermissions.has(permission);
    } catch (error) {
      console.error('❌ Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get user permissions
   * @param {string} userId - User ID
   */
  static async getUserPermissions(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: true
            }
          },
          roleAssignments: {
            where: { isActive: true },
            include: {
              role: {
                include: {
                  permissions: true
                }
              }
            }
          },
          permissionOverrides: {
            where: { 
              expiresAt: {
                gt: new Date()
              }
            },
            include: {
              permission: true
            }
          }
        }
      });

      if (!user) return { permissions: [], roles: [] };

      const permissions = new Set();
      const roles = new Set();

      // Add primary role
      if (user.role) {
        roles.add(user.role.name);
        user.role.permissions.forEach(perm => {
          permissions.add(perm.name);
        });
      }

      // Add assigned roles
      user.roleAssignments.forEach(assignment => {
        roles.add(assignment.role.name);
        assignment.role.permissions.forEach(perm => {
          permissions.add(perm.name);
        });
      });

      // Apply overrides
      user.permissionOverrides.forEach(override => {
        if (override.granted) {
          permissions.add(override.permission.name);
        } else {
          permissions.delete(override.permission.name);
        }
      });

      return {
        permissions: Array.from(permissions),
        roles: Array.from(roles),
        overrides: user.permissionOverrides.map(override => ({
          permission: override.permission.name,
          granted: override.granted,
          reason: override.reason,
          expiresAt: override.expiresAt
        }))
      };
    } catch (error) {
      console.error('❌ Error getting user permissions:', error);
      return { permissions: [], roles: [] };
    }
  }

  /**
   * Assign role to user
   * @param {string} userId - User ID
   * @param {string} roleId - Role ID
   * @param {string} assignedBy - Admin ID who assigned the role
   * @param {Date} expiresAt - Optional expiration date
   */
  static async assignRole(userId, roleId, assignedBy, expiresAt = null) {
    try {
      const roleAssignment = await prisma.roleAssignment.create({
        data: {
          userId,
          roleId,
          assignedBy,
          expiresAt
        },
        include: {
          role: true,
          user: {
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
        adminId: assignedBy,
        action: 'role_assigned',
        resourceType: 'role',
        resourceId: roleId,
        userId,
        details: {
          roleName: roleAssignment.role.name,
          expiresAt
        },
        success: true
      });

      return roleAssignment;
    } catch (error) {
      console.error('❌ Error assigning role:', error);
      throw error;
    }
  }

  /**
   * Remove role from user
   * @param {string} userId - User ID
   * @param {string} roleId - Role ID
   * @param {string} removedBy - Admin ID who removed the role
   */
  static async removeRole(userId, roleId, removedBy) {
    try {
      const roleAssignment = await prisma.roleAssignment.updateMany({
        where: {
          userId,
          roleId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: removedBy,
        action: 'role_removed',
        resourceType: 'role',
        resourceId: roleId,
        userId,
        details: { roleId },
        success: true
      });

      return roleAssignment;
    } catch (error) {
      console.error('❌ Error removing role:', error);
      throw error;
    }
  }

  /**
   * Grant permission override
   * @param {string} userId - User ID
   * @param {string} permissionId - Permission ID
   * @param {boolean} granted - Whether to grant or deny
   * @param {string} grantedBy - Admin ID who granted the override
   * @param {string} reason - Reason for override
   * @param {Date} expiresAt - Optional expiration date
   */
  static async grantPermissionOverride(userId, permissionId, granted, grantedBy, reason = null, expiresAt = null) {
    try {
      const override = await prisma.permissionOverride.create({
        data: {
          userId,
          permissionId,
          granted,
          reason,
          grantedBy,
          expiresAt
        },
        include: {
          permission: true,
          user: {
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
        adminId: grantedBy,
        action: 'permission_override_granted',
        resourceType: 'permission',
        resourceId: permissionId,
        userId,
        details: {
          permissionName: override.permission.name,
          granted,
          reason,
          expiresAt
        },
        success: true
      });

      return override;
    } catch (error) {
      console.error('❌ Error granting permission override:', error);
      throw error;
    }
  }

  /**
   * Get all roles
   */
  static async getRoles() {
    try {
      return await prisma.role.findMany({
        include: {
          permissions: true,
          _count: {
            select: {
              users: true
          }
        }
      }
    });
    } catch (error) {
      console.error('❌ Error getting roles:', error);
      throw error;
    }
  }

  /**
   * Get all permissions
   */
  static async getPermissions() {
    try {
      return await prisma.permission.findMany({
        include: {
          _count: {
            select: {
              roles: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Error getting permissions:', error);
      throw error;
    }
  }

  /**
   * Create role
   * @param {Object} roleData - Role data
   * @param {string} createdBy - Admin ID who created the role
   */
  static async createRole(roleData, createdBy) {
    try {
      const role = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          permissions: {
            connect: roleData.permissionIds?.map(id => ({ id })) || []
          }
        },
        include: {
          permissions: true
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: createdBy,
        action: 'role_created',
        resourceType: 'role',
        resourceId: role.id,
        details: {
          roleName: role.name,
          description: role.description,
          permissions: role.permissions.map(p => p.name)
        },
        success: true
      });

      return role;
    } catch (error) {
      console.error('❌ Error creating role:', error);
      throw error;
    }
  }

  /**
   * Update role
   * @param {string} roleId - Role ID
   * @param {Object} roleData - Updated role data
   * @param {string} updatedBy - Admin ID who updated the role
   */
  static async updateRole(roleId, roleData, updatedBy) {
    try {
      const role = await prisma.role.update({
        where: { id: roleId },
        data: {
          name: roleData.name,
          description: roleData.description,
          permissions: {
            set: roleData.permissionIds?.map(id => ({ id })) || []
          }
        },
        include: {
          permissions: true
        }
      });

      // Log audit
      await AuditService.logAction({
        adminId: updatedBy,
        action: 'role_updated',
        resourceType: 'role',
        resourceId: roleId,
        details: {
          roleName: role.name,
          description: role.description,
          permissions: role.permissions.map(p => p.name)
        },
        success: true
      });

      return role;
    } catch (error) {
      console.error('❌ Error updating role:', error);
      throw error;
    }
  }

  /**
   * Delete role
   * @param {string} roleId - Role ID
   * @param {string} deletedBy - Admin ID who deleted the role
   */
  static async deleteRole(roleId, deletedBy) {
    try {
      const role = await prisma.role.delete({
        where: { id: roleId }
      });

      // Log audit
      await AuditService.logAction({
        adminId: deletedBy,
        action: 'role_deleted',
        resourceType: 'role',
        resourceId: roleId,
        details: {
          roleName: role.name
        },
        success: true
      });

      return role;
    } catch (error) {
      console.error('❌ Error deleting role:', error);
      throw error;
    }
  }

  /**
   * Get role statistics
   */
  static async getRoleStats() {
    try {
      const [roles, totalUsers, roleAssignments] = await Promise.all([
        prisma.role.count(),
        prisma.user.count(),
        prisma.roleAssignment.count({
          where: { isActive: true }
        })
      ]);

      const roleDistribution = await prisma.role.findMany({
        include: {
          _count: {
            select: {
              users: true
            }
          }
        }
      });

      return {
        totalRoles: roles,
        totalUsers,
        activeRoleAssignments: roleAssignments,
        roleDistribution: roleDistribution.map(role => ({
          name: role.name,
          userCount: role._count.users
        }))
      };
    } catch (error) {
      console.error('❌ Error getting role stats:', error);
      throw error;
    }
  }
}

module.exports = RBACService;
