const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auditService = require('./auditService');

class ApiManagementService {
  async createApiKey(data, adminId) {
    const apiKey = await prisma.apiKey.create({ data });
    await auditService.log('api_key_created', adminId, { apiKeyId: apiKey.id });
    return apiKey;
  }
  async getApiKeys(filter = {}) {
    return prisma.apiKey.findMany({ where: filter });
  }
  async revokeApiKey(id, adminId) {
    const apiKey = await prisma.apiKey.update({ where: { id }, data: { isActive: false } });
    await auditService.log('api_key_revoked', adminId, { apiKeyId: id });
    return apiKey;
  }
  async logRequest(data) {
    return prisma.apiRequest.create({ data });
  }
  async getRequests(filter = {}) {
    return prisma.apiRequest.findMany({ where: filter });
  }
  async registerEndpoint(data, adminId) {
    const endpoint = await prisma.apiEndpoint.create({ data });
    await auditService.log('api_endpoint_registered', adminId, { endpointId: endpoint.id });
    return endpoint;
  }
  async getEndpoints(filter = {}) {
    return prisma.apiEndpoint.findMany({ where: filter });
  }
  async updateEndpoint(id, data, adminId) {
    const endpoint = await prisma.apiEndpoint.update({ where: { id }, data });
    await auditService.log('api_endpoint_updated', adminId, { endpointId: id });
    return endpoint;
  }
  async deleteEndpoint(id, adminId) {
    const endpoint = await prisma.apiEndpoint.delete({ where: { id } });
    await auditService.log('api_endpoint_deleted', adminId, { endpointId: id });
    return endpoint;
  }
}

module.exports = new ApiManagementService(); 