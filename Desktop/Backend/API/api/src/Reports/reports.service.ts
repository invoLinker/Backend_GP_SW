import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { ReportRegistry } from './report-registry';
import { ReportAIService } from './report-ai.service';
import {
  ReportRequest,
  ReportResponse,
  ReportType,
  ReportOutputType,
  ReportDefinition,
} from './report-types';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly sequelize: Sequelize,
    private readonly aiService: ReportAIService,
  ) {
    // تهيئة التقارير عند بدء التشغيل
    ReportRegistry.initializeReports(this.sequelize);
  }

  /**
   * الحصول على جميع التقارير المتاحة
   */
  async getAllReports(userRole?: string): Promise<ReportDefinition[]> {
    if (userRole) {
      return ReportRegistry.getReportsForRole(userRole);
    }
    return ReportRegistry.getAllReports();
  }

  /**
   * الحصول على تقرير محدد
   */
  async getReport(reportId: string): Promise<ReportDefinition | null> {
    const report = ReportRegistry.getReport(reportId);
    if (!report) {
      throw new NotFoundException(`التقرير "${reportId}" غير موجود`);
    }
    return report;
  }

  /**
   * تنفيذ التقرير
   */
  async executeReport(
    request: ReportRequest,
    userRole?: string,
  ): Promise<ReportResponse> {
    const startTime = Date.now();

    try {
      this.logger.log(`Executing report: ${request.reportId}`);

      // 1. الحصول على تعريف التقرير
      const report = ReportRegistry.getReport(request.reportId);
      if (!report) {
        throw new NotFoundException(`التقرير "${request.reportId}" غير موجود`);
      }

      // 2. التحقق من الصلاحيات
      if (report.allowedRoles && userRole && !report.allowedRoles.includes(userRole)) {
        throw new BadRequestException('ليس لديك صلاحية للوصول إلى هذا التقرير');
      }

      // 3. التحقق من المعاملات المطلوبة
      this.validateParameters(report, request.parameters || {});

      // 4. تحديد نوع المخرج
      const outputType = request.outputType || report.outputType;

      // 5. جلب البيانات
      let data: any = null;
      if (report.dataFetcher) {
        data = await report.dataFetcher(request.parameters || {});
      } else if (report.sqlQuery) {
        const sql = typeof report.sqlQuery === 'function'
          ? report.sqlQuery(request.parameters || {})
          : report.sqlQuery;
        const [results] = await this.sequelize.query(sql);
        data = results;
      } else {
        throw new BadRequestException('التقرير لا يحتوي على طريقة لجلب البيانات');
      }

      // 6. تحديد اللغة
      const language = request.language || 'ar';

      // 7. بناء الاستجابة بناءً على نوع المخرج
      const response: ReportResponse = {
        success: true,
        reportId: report.id,
        reportName: report.name,
        type: report.type,
        metadata: {
          rowCount: Array.isArray(data) ? data.length : 0,
          executionTime: `${Date.now() - startTime}ms`,
          generatedAt: new Date(),
        },
      };

      // 8. إضافة البيانات إذا كان المطلوب
      if (outputType === ReportOutputType.DATA || outputType === ReportOutputType.BOTH) {
        response.data = data;
      }

      // 9. إضافة التحليل AI إذا كان مطلوباً
      if (
        (outputType === ReportOutputType.AI_ANALYSIS || outputType === ReportOutputType.BOTH) &&
        (report.type === ReportType.AI_ANALYTICAL || report.requiresAIAnalysis)
      ) {
        this.logger.log('Generating AI analysis...');
        response.analysis = await this.aiService.generateAnalyticalReport(
          Array.isArray(data) ? data : [data],
          report.name,
          report.description,
          language,
        );
      }

      this.logger.log(`Report executed successfully: ${request.reportId}`);
      return response;
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Error executing report: ${error.message}`, error.stack);

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      return {
        success: false,
        reportId: request.reportId,
        reportName: '',
        type: ReportType.PRE_BUILT,
        error: error.message || 'حدث خطأ أثناء تنفيذ التقرير',
        metadata: {
          executionTime: `${executionTime}ms`,
          generatedAt: new Date(),
        },
      };
    }
  }

  /**
   * التحقق من صحة المعاملات
   */
  private validateParameters(report: ReportDefinition, params: Record<string, any>): void {
    if (!report.parameters) {
      return;
    }

    for (const param of report.parameters) {
      if (param.required && (params[param.name] === undefined || params[param.name] === null)) {
        throw new BadRequestException(`المعامل "${param.name}" مطلوب`);
      }

      // التحقق من نوع البيانات
      if (params[param.name] !== undefined) {
        const value = params[param.name];
        switch (param.type) {
          case 'number':
            if (typeof value !== 'number' && isNaN(Number(value))) {
              throw new BadRequestException(`المعامل "${param.name}" يجب أن يكون رقماً`);
            }
            break;
          case 'date':
            if (isNaN(Date.parse(value))) {
              throw new BadRequestException(`المعامل "${param.name}" يجب أن يكون تاريخاً صحيحاً`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              throw new BadRequestException(`المعامل "${param.name}" يجب أن يكون true أو false`);
            }
            break;
        }
      }
    }
  }

  /**
   * إضافة تقرير جديد ديناميكياً (للاستخدام البرمجي)
   */
  registerCustomReport(report: ReportDefinition): void {
    ReportRegistry.registerReport(report);
    this.logger.log(`Custom report registered: ${report.id}`);
  }
}

