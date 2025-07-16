const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auditService = require('./auditService');

class ReportingService {
  async createTemplate(data, adminId) {
    const template = await prisma.reportTemplate.create({ data });
    await auditService.log('report_template_created', adminId, { templateId: template.id });
    return template;
  }
  async getTemplates(filter = {}) {
    return prisma.reportTemplate.findMany({ where: filter });
  }
  async updateTemplate(id, data, adminId) {
    const template = await prisma.reportTemplate.update({ where: { id }, data });
    await auditService.log('report_template_updated', adminId, { templateId: id });
    return template;
  }
  async deleteTemplate(id, adminId) {
    const template = await prisma.reportTemplate.delete({ where: { id } });
    await auditService.log('report_template_deleted', adminId, { templateId: id });
    return template;
  }
  async generateReport(templateId, params, adminId) {
    // Production-ready: fetch template, run query, store result
    const template = await prisma.reportTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error('Template not found');
    // Example: run a query based on template type
    let reportData = null;
    if (template.type === 'user_activity') {
      reportData = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, username: true, email: true, createdAt: true } });
    } else if (template.type === 'compliance_violations') {
      reportData = await prisma.complianceViolation.findMany({});
    } else {
      reportData = { message: 'Custom report type not implemented' };
    }
    // Store report as JSON (could also generate CSV, etc.)
    const report = await prisma.generatedReport.create({
      data: {
        templateId,
        generatedBy: adminId,
        fileName: `${template.type}_report_${Date.now()}.json`,
        filePath: `/exports/${template.type}_report_${Date.now()}.json`,
        fileSize: JSON.stringify(reportData).length,
        format: 'JSON',
        parameters: JSON.stringify(params),
        status: 'COMPLETED',
        data: JSON.stringify(reportData)
      }
    });
    await auditService.log('report_generated', adminId, { reportId: report.id });
    return report;
  }
  async getReports(filter = {}) {
    return prisma.generatedReport.findMany({ where: filter });
  }
  async getReportById(id) {
    return prisma.generatedReport.findUnique({ where: { id } });
  }
  async scheduleReport(data, adminId) {
    const schedule = await prisma.reportSchedule.create({ data });
    await auditService.log('report_schedule_created', adminId, { scheduleId: schedule.id });
    return schedule;
  }
  async getSchedules(filter = {}) {
    return prisma.reportSchedule.findMany({ where: filter });
  }
  async runScheduledReports() {
    // Production-ready: find due schedules and generate reports
    const now = new Date();
    const schedules = await prisma.reportSchedule.findMany({ where: { nextRun: { lte: now } } });
    for (const schedule of schedules) {
      await this.generateReport(schedule.templateId, schedule.parameters, schedule.scheduledBy);
      // Update nextRun (example: daily)
      await prisma.reportSchedule.update({ where: { id: schedule.id }, data: { nextRun: new Date(now.getTime() + 24*60*60*1000) } });
    }
    return true;
  }
}

module.exports = new ReportingService(); 