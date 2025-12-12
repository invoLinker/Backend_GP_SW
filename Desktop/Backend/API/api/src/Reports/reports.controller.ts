import { Body, Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService, AIInsight } from './Admin/reports.service';
import { AccountingReportsService } from './Accountant/reports-accounting.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService,
              private reports: AccountingReportsService
  ) {}
 
  ////////////////////////////////////////////////////////Admin
  @Get('summary')
  async getSummary() {
    return this.reportsService.getSummary();
  }

  @Get('payment-summary')
  async getPaymentSummary(@Query('year') year: number) {
    return this.reportsService.getPaymentSummary(year);
  }

  @Get('monthly')
  async getInvoicesPerMonth( @Query('year') year: number) {
    return this.reportsService.getInvoicesPerMonth(year);
  }

  @Get('payment-methods')
  async getPaymentMethods(@Query('year') year: number) {
    return this.reportsService.getPaymentMethods(year);
  }

  @Get('aging')
  async getAgingBuckets() {
    return this.reportsService.getAgingBuckets();
  }

  @Get('payment-delay')
  async getPaymentDelay(@Query('year') year: number) {
    return this.reportsService.getPaymentDelay(year);
  }

  @Get('po-growth')
  getPurchaseOrderGrowth(@Query('year') year: number) {
    return this.reportsService.getMonthlyPayments(year);
  }

  @Get('/supplier-price-analysis')
  async supplierPriceAnalysis(@Query('year') year: number) {
  return this.reportsService.getSupplierPriceAnalysis(year);
  }

  @Get('product-history/:product')
  async getProductHistory(@Param('product') product: string) {
    return await this.reportsService.getProductPriceHistory(product);
  }

   @Get("payment-method-stats")
  async getPaymentMethodStats(@Query('year') year: number) {
    return await this.reportsService.getPaymentMethodStats(year);
  }

  @Get('ai-insights')
  async getAIInsights(): Promise<AIInsight[]> {
    return await this.reportsService.getAIInsights();
  }
   ////////////////////////////////////////////////////////Accountant

  @Get('get-audit-stats')
  async getDashboard(@Query('year') year: number) {
    return await this.reports.getAuditStats(year);
  }

  @Get('verification-by-type')
  async getVerificationByType(@Query('year') year: number) {
    return await this.reports.getVerificationByType(year);
  }

  @Get('monthly-trend')
  async getMonthlyTrend(@Query('year') year: number) {
    return await this.reports.getMonthlyTrend(year);
  }

  @Get('task-performance')
  async getTaskPerformance(@Query('full_name') full_name: string) {
    return await this.reports.getTaskPerformance(full_name);
  }

  @Get('average-processing-time')
  async getAverageProcessingTime(@Query('full_name') full_name: string) {
    return await this.reports.getVerificationAndTaskAveragesForUser(full_name);
  }
}
