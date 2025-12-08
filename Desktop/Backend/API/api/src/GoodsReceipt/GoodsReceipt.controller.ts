import { Body, Controller, Post, UseGuards, Request, Get, Query, Param, Delete, Patch } from '@nestjs/common';
import { GoodsReceiptService } from './GoodsReceipt.service';
import { CreateGoodsReceiptDto } from './GoodsReceiptDto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';

@Controller('goods-receipts')
export class GoodsReceiptController {
  constructor(private readonly grService: GoodsReceiptService,
              private readonly historyLogService: HistoryLogService
  ) {}
  @Post()
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_delivery_note')
  async create(@Body() body:  CreateGoodsReceiptDto, @Request() req) {
  try {
      const gr = await this.grService.createGR(body, req.user.userId);

      await this.historyLogService.createLog({
        action: 'Goods Receipt Created',
        description: `Goods Receipt with #${gr!.gr_number} created`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: gr,
      });

      return gr;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Goods Receipt Creation Failed',
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
  @PermissionName('get_delivery_note')
  async getAll() {
    return this.grService.getAll();
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_delivery_note')
  async getByStatus(@Param('status') status: string) {
    return this.grService.getByStatus(status);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_delivery_note')
  async search(@Query('q') keyword: string) {
    return this.grService.search(keyword);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_delivery_note')
  async updateGR(@Param('id') id: number, @Body() dto: CreateGoodsReceiptDto, @Request() req) {
     try {
      const updated = await this.grService.updateGR(id, dto);

      await this.historyLogService.createLog({
        action: 'Goods Receipt Updated',
        description: `Goods Receipt with id=${id} updated`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: updated.message,
      });

      return updated;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Goods Receipt Update Failed',
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
  @PermissionName('delete_delivery_note')
  async deleteGR(@Param('id') id: number, @Request() req) {
     try {
      const result = await this.grService.deleteGR(id);

      await this.historyLogService.createLog({
        action: 'Goods Receipt Deleted',
        description: `Goods Receipt with id=${id} deleted`,
        user: req.user.email,
        userRole: req.user.role,
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details:  result.message,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Goods Receipt Deletion Failed',
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