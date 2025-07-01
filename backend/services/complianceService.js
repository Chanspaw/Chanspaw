const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auditService = require('./auditService');

class ComplianceService {
  async createReport(data, adminId) {
    try {
      const report = await prisma.complianceReport.create({ data });
      await auditService.log('compliance_report_created', adminId, { reportId: report.id });
      return report;
    } catch (err) {
      await auditService.log('compliance_report_create_failed', adminId, { error: err.message });
      throw err;
    }
  }
  async getReports(filter = {}) {
    return prisma.complianceReport.findMany({ where: filter });
  }
  async getReportById(id) {
    return prisma.complianceReport.findUnique({ where: { id } });
  }
  async updateReportStatus(id, status, adminId) {
    const report = await prisma.complianceReport.update({ where: { id }, data: { status } });
    await auditService.log('compliance_report_status_updated', adminId, { reportId: id, status });
    return report;
  }
  async createRule(data, adminId) {
    const rule = await prisma.complianceRule.create({ data });
    await auditService.log('compliance_rule_created', adminId, { ruleId: rule.id });
    return rule;
  }
  async getRules(filter = {}) {
    return prisma.complianceRule.findMany({ where: filter });
  }
  async updateRule(id, data, adminId) {
    const rule = await prisma.complianceRule.update({ where: { id }, data });
    await auditService.log('compliance_rule_updated', adminId, { ruleId: id });
    return rule;
  }
  async deleteRule(id, adminId) {
    const rule = await prisma.complianceRule.delete({ where: { id } });
    await auditService.log('compliance_rule_deleted', adminId, { ruleId: id });
    return rule;
  }
  async logViolation(data, adminId) {
    const violation = await prisma.complianceViolation.create({ data });
    await auditService.log('compliance_violation_logged', adminId, { violationId: violation.id });
    return violation;
  }
  async getViolations(filter = {}) {
    return prisma.complianceViolation.findMany({ where: filter });
  }
  async resolveViolation(id, resolvedBy, resolution) {
    const violation = await prisma.complianceViolation.update({ where: { id }, data: { status: 'RESOLVED', resolvedBy, resolvedAt: new Date(), description: resolution } });
    await auditService.log('compliance_violation_resolved', resolvedBy, { violationId: id });
    return violation;
  }
  async riskScoreUser(userId) {
    // Placeholder: implement risk scoring logic
    return Math.floor(Math.random() * 100);
  }
}

module.exports = new ComplianceService(); 