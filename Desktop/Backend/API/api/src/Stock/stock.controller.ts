import { Controller, Get, Post, Body, Param, Query, Delete, UseGuards,Req, Patch } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './CreateStockDto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { UpdateStockDto } from './UpdateStockDTO';
import { FilterStockDto } from './FilterStockDto';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';
import { database } from 'firebase-admin';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService,
              private readonly historyLogService: HistoryLogService

  ) {}

  @Post(':inv_id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_stock')
  async create(@Param('inv_id') inv_id: number, @Req() req: any) {
    try {
      const result = await this.stockService.create(inv_id);

      await this.historyLogService.createLog({
        action: 'Stock Created',
        description: `Stock for invoice with ID ${inv_id} created`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Stock Creation Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_stock')
 async getStocks(@Query() filter: FilterStockDto) {
    return this.stockService.getAllStocksWithQuantity(filter);
  }

  
  @Get('all')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_stock')
  async getAll() {
    return this.stockService.getAllStocks();
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_stock')
  async getByStatus(@Param('status') status: string) {
    return this.stockService.getStocksByStatus(status);
  }


  @Get('search')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_stock')
  async search(@Query('q') q: string) {
    return this.stockService.searchStocks(q);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_stock')
  async update(@Body() updateStockDto: UpdateStockDto, @Req() req: any) {
    try {
      const result = await this.stockService.takeFromStockByName(
        updateStockDto.product_name!,
        updateStockDto.quantity!
      );

      await this.historyLogService.createLog({
        action: 'Stock Quantity Updated',
        description: `Stock of ${updateStockDto.product_name} decreased by ${updateStockDto.quantity}`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Update Stock Quantity Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: updateStockDto,
      });
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_stock')
  async updateState(@Param('id') id: number, @Body() updateStockDto: UpdateStockDto, @Req() req: any) {
    try {
      const result = await this.stockService.updateStockState(id, updateStockDto.status!);

      await this.historyLogService.createLog({
        action: 'Stock State Updated',
        description: `Stock id=${id} status changed to ${updateStockDto.status}`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Update Stock State Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @Patch('date/:id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_stock')
  async updateDate(@Param('id') id: number, @Body() updateStockDto: UpdateStockDto, @Req() req: any) {
    try {
      const result = await this.stockService.updateStockExpiration(id, updateStockDto.expiration_date!);

      await this.historyLogService.createLog({
        action: 'Stock Expiration Updated',
        description: `Stock id=${id} expiration date updated to ${updateStockDto.expiration_date}`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Update Stock Expiration Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

 
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_stock')
  async remove(@Param('id') stockId: number, @Req() req: any) {
    try {
      const result = await this.stockService.deleteStock(stockId);

      await this.historyLogService.createLog({
        action: 'Stock Deleted',
        description: `Stock id=${stockId} deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.WARNING,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delete Stock Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

}
