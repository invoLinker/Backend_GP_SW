import { Body, Controller, Get, Param, Query, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ReportsService, AIInsight } from './Admin/reports.service';
import { AccountingReportsService } from './Accountant/reports-accounting.service';
import { ReportsPaymentService } from './Payment_Officer/repoet.payment';
import { warehouseReportService } from './Warehouse/report.warehouse';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService,
              private reports: AccountingReportsService,
              private reportsPayment: ReportsPaymentService,
              private warehouseReportService :warehouseReportService

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
 
  ////////////////////////////////////////////////////////Payment Officer

 @Get('transaction-volume')
  async getTransactionVolume(
    @Query('periodType') periodType: 'weekly' | 'monthly' | 'yearly',
    @Query('year', ParseIntPipe) year: number,
    @Query('month') month?: 'January'|'February'|'March'|'April'|'May'|'June'|'July'|'August'|'September'|'October'|'November'|'December',
    @Query('week') week?: string
  ) {

    if (!periodType) {
      throw new BadRequestException('periodType is required');
    }

    if (!year) {
      throw new BadRequestException('year is required');
    }

    const yearNumber = Number(year);
    if (isNaN(yearNumber)) {
      throw new BadRequestException('year must be a number');
    }

    return this.reportsPayment.getTransactionVolume(
      periodType,
      yearNumber,
      month,   
      week     
    );
  }


  @Get('daily-payment-trends')
  async getTrends(
    @Query('periodType') periodType: 'weekly' | 'monthly',
    @Query('year' ,ParseIntPipe) year: number,
    @Query('month') month?: 'January'|'February'|'March'|'April'|'May'|'June'|'July'|'August'|'September'|'October'|'November'|'December',
    @Query('week') week?: string,
  ) {
    return this.reportsPayment.getDailyTrends(
      periodType,
      year,
      month ,
      week
    );
  }


  @Get('weekly-payment-comparison')
  async getComparison(
    @Query('periodType') periodType: 'weekly' | 'monthly',
    @Query('year',ParseIntPipe) year: number,
    @Query('month') month?:  'January'|'February'|'March'|'April'|'May'|'June'|'July'|'August'|'September'|'October'|'November'|'December',
    @Query('week') week?: string,
  ) {
    return this.reportsPayment.getPaymentComparison(
      periodType,
      year,
      month,
      week
    );
  }


  @Get('payment-method-performance')
  async getPerformance() {
    return this.reportsPayment.getPerformance();
  }

  @Get('success-rate')
  async getSuccessRate(
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.reportsPayment.getSuccessRate(year);
  }

  @Get("exchange-impact")
  async getExchangeImpact(
    @Query("periodType") periodType: 'weekly' | 'monthly' | 'yearly',
    @Query("year") year: number,
    @Query("month") month?: string,
    @Query("week") week?: string,
  ) {
    return this.reportsPayment.getExchangeImpact(periodType, Number(year), month, week);
}

@Get("payment-summary2")
async getSummaryPayment() {
  return this.reportsPayment.getPaymentSummary();
}

 ////////////////////////////////////////////////////////Warehouse

 @Get('status-distribution')
  getStockStatusDistribution(
    @Query('year') year?: number,
  ) {
    return this.warehouseReportService.getStockStatusDistribution(
      year ? Number(year) : undefined
    );
  }

  @Get('expiration-range')
  getStockByExpirationRange() {
    return this.warehouseReportService.getStockByExpirationRange();
  }

  @Get('top-products')
  getTopProducts() {
    return this.warehouseReportService.getTopProductsByQuantity();
  }

  @Get('trend')
  getTrend(
    @Query('periodType') periodType: 'monthly' | 'yearly',
    @Query('year') year?: string,
  ) {
    return this.warehouseReportService.getGoodsReceiptsTrend(
      periodType,
      year ? Number(year) : undefined,
    );
  }

  @Get('stock-aging')
  getStockAging() {
    return this.warehouseReportService.getStockAgingAnalysis();
  }

  @Get('stock-value')
  getStockValueReport() {
    return this.warehouseReportService.getStockValueReport();
  }

  @Get('expired-loss')
  getExpiredLossReport() {
    return this.warehouseReportService.getExpiredLossReport();
  }

  @Get('supplier-impact')
  getSupplierImpactOnStock() {
    return this.warehouseReportService.getSupplierImpactOnStock();
  }

  @Get('fast-slow-products')
  getFastVsSlowMovingProducts() {
    return this.warehouseReportService.getFastVsSlowMovingProducts();
  }

  @Get('warehouse-summary')
  getWarehouseSummary() {
    return this.warehouseReportService.getWarehouseSummary();
  }
}
