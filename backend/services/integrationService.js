const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auditService = require('./auditService');

class IntegrationService {
  async createIntegration(data, adminId) {
    const integration = await prisma.integration.create({ data });
    await auditService.log('integration_created', adminId, { integrationId: integration.id });
    return integration;
  }
  async getIntegrations(filter = {}) {
    return prisma.integration.findMany({ where: filter });
  }
  async updateIntegration(id, data, adminId) {
    const integration = await prisma.integration.update({ where: { id }, data });
    await auditService.log('integration_updated', adminId, { integrationId: id });
    return integration;
  }
  async deleteIntegration(id, adminId) {
    const integration = await prisma.integration.delete({ where: { id } });
    await auditService.log('integration_deleted', adminId, { integrationId: id });
    return integration;
  }
  async logIntegrationEvent(data) {
    return prisma.integrationLog.create({ data });
  }
  async getLogs(filter = {}) {
    return prisma.integrationLog.findMany({ where: filter });
  }
  async createWebhook(data, adminId) {
    const webhook = await prisma.webhook.create({ data });
    await auditService.log('webhook_created', adminId, { webhookId: webhook.id });
    return webhook;
  }
  async getWebhooks(filter = {}) {
    return prisma.webhook.findMany({ where: filter });
  }
  async updateWebhook(id, data, adminId) {
    const webhook = await prisma.webhook.update({ where: { id }, data });
    await auditService.log('webhook_updated', adminId, { webhookId: id });
    return webhook;
  }
  async deleteWebhook(id, adminId) {
    const webhook = await prisma.webhook.delete({ where: { id } });
    await auditService.log('webhook_deleted', adminId, { webhookId: id });
    return webhook;
  }
  async logWebhookDelivery(data) {
    return prisma.webhookDelivery.create({ data });
  }
  async getWebhookDeliveries(filter = {}) {
    return prisma.webhookDelivery.findMany({ where: filter });
  }
}

module.exports = new IntegrationService(); 