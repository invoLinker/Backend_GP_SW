import { Controller, Post, Body, UseGuards, Get , Param, Patch, Delete, Query, Req, UploadedFile,Request, UseInterceptors, BadRequestException, NotFoundException} from '@nestjs/common';
import { PurchaseOrderService } from './po.service';
import { CreatePurchaseOrderDto } from './CreatePurchaseOrderDto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../permission/PermissionsGuard';
import { PurchaseOrder } from './po.model';
import { PermissionName } from 'src/permission/permission.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { LOADIPHLPAPI } from 'dns';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';


@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService,
              private readonly historyLogService: HistoryLogService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_purchase_order')
  async create(
    @Body() createPoDto: CreatePurchaseOrderDto, @Request() req): Promise<PurchaseOrder> {
     try {
      const po = await this.poService.create(createPoDto, req.user.userId);

      await this.historyLogService.createLog({
        action: 'Purchase Order Created',
        description: `PO #${po.po_number} created successfully`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: po,
      });

      return po;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Purchase Order Creation Failed',
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
  @PermissionName('get_purchase_order')
  async findAll(): Promise<PurchaseOrder[]> {
    return this.poService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_purchase_order')
   findOne(@Param('id') id: number): Promise<PurchaseOrder> {
    return this.poService.findOne(id);
  }

  @Get('po-number/:id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_purchase_order')
   findByPONumber(@Param('id') id: string): Promise<PurchaseOrder> {
    return this.poService.findByPONumber(id);
  }


  @Get('supplier/:id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_purchase_order')
  getBySupplier(@Param('id') supplierId: string) {
    return this.poService.findBySupplier(+supplierId);
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_purchase_order')
  getByStatus(@Param('status') status: 'Open'| 'Closed'| 'Cancelled'| 'Draft'| 'Approved'| 'Sent' |'Incident'|'ReadyForPaid') {
    return this.poService.findByStatus(status);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_purchase_order')
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreatePurchaseOrderDto>,
    @Req() req: any  
  ) {
    try {
      const userId = req.user.userId;
      const updated = await this.poService.update(+id, updateDto, userId);

      await this.historyLogService.createLog({
        action: 'Purchase Order Updated',
        description: `PO with ID ${id} updated successfully`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: updated,
      });

      return updated;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Purchase Order Update Failed',
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
  @PermissionName('delete_purchase_order')
  async deleteById(@Param('id') id: string, @Req() req) {
    try {
      const result = await this.poService.deleteById(Number(id));

      await this.historyLogService.createLog({
        action: 'Purchase Order Deleted',
        description: `PO with ID ${id} deleted`,
        user: req.user.email,
        userRole: req.user.role,
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Purchase Order Deletion Failed',
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

  @Delete()
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_purchase_order')
  async deleteAll(@Req() req) {
    try {
      const result = await this.poService.deleteAll();

      await this.historyLogService.createLog({
        action: 'All Purchase Orders Deleted',
        description: `All POs deleted by ${req.user.email}`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delete All Purchase Orders Failed',
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

  // 🔴 حذف حسب المورد
  @Delete('supplier/:supplierId')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_purchase_order')
  async deleteBySupplier(@Param('supplierId') supplierId: string, @Req() req) {
    try {
      const result = await this.poService.deleteBySupplierId(Number(supplierId));

      await this.historyLogService.createLog({
        action: 'Purchase Orders Deleted by Supplier',
        description: `POs deleted for supplier with ID ${supplierId}`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delete Purchase Orders by Supplier Failed',
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

  // 🔴 حذف حسب الحالة
  @Delete('status/:status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_purchase_order')
  async deleteByStatus(@Param('status') status: string, @Req() req) {
    try {
      const result = await this.poService.deleteByStatus(status);

      await this.historyLogService.createLog({
        action: 'Purchase Orders Deleted by Status',
        description: `POs with status ${status} deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delete Purchase Orders by Status Failed',
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