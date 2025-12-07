import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';
import * as reportTypes from './report-types';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * الحصول على جميع التقارير المتاحة
   * GET /reports
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAllReports(@Request() req: any): Promise<{
    success: boolean;
    reports: reportTypes.ReportDefinition[];
  }> {
    const userRole = req.user?.role;
    const reports = await this.reportsService.getAllReports(userRole);
    
    return {
      success: true,
      reports,
    };
  }

  /**
   * الحصول على تقرير محدد
   * GET /reports/:reportId
   */
  @Get(':reportId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getReport(@Param('reportId') reportId: string): Promise<{
    success: boolean;
    report: reportTypes.ReportDefinition | null;
  }> {
    const report = await this.reportsService.getReport(reportId);
    
    return {
      success: true,
      report,
    };
  }

  /**
   * تنفيذ تقرير
   * POST /reports/execute
   * 
   * Body example:
   * {
   *   "reportId": "purchase_orders_summary",
   *   "parameters": {
   *     "startDate": "2024-01-01",
   *     "endDate": "2024-12-31",
   *     "status": "approved"
   *   },
   *   "outputType": "both",
   *   "language": "ar"
   * }
   */
  @Post('execute')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async executeReport(
    @Body() body: reportTypes.ReportRequest,
    @Request() req: any,
  ): Promise<reportTypes.ReportResponse> {
    const userRole = req.user?.role;
    
    // التحقق من وجود reportId
    if (!body.reportId) {
      return {
        success: false,
        reportId: '',
        reportName: '',
        type: 'pre_built' as any,
        error: 'معرف التقرير مطلوب',
      };
    }

    return await this.reportsService.executeReport(body, userRole);
  }

  /**
   * تنفيذ تقرير سريع (بدون معاملات)
   * POST /reports/:reportId/execute
   */
  @Post(':reportId/execute')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async executeReportQuick(
    @Param('reportId') reportId: string,
    @Body() body: Partial<reportTypes.ReportRequest> = {},
    @Request() req: any,
  ): Promise<reportTypes.ReportResponse> {
    const userRole = req.user?.role;
    
    const request: reportTypes.ReportRequest = {
      reportId,
      parameters: body.parameters,
      outputType: body.outputType,
      language: body.language,
    };

    return await this.reportsService.executeReport(request, userRole);
  }
}

