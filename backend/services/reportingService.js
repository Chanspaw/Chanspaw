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
    // Placeholder: implement report generation logic
    const report = await prisma.generatedReport.create({ data: { templateId, generatedBy: adminId, fileName: 'report.csv', filePath: '/exports/report.csv', fileSize: 1234, format: 'CSV', parameters: JSON.stringify(params), status: 'COMPLETED' } });
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
    // Placeholder: implement scheduled report runner
    return true;
  }
}

module.exports = new ReportingService(); 