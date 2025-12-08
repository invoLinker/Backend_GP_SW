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
import { diskStorage } from 'multer';
import { extname } from 'path';


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
        description: `PO with #${po.po_number} created successfully`,
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

  @Get('pending-approvals')
  @UseGuards(JwtAuthGuard)
  async getPendingApprovals() {
    return this.poService.getPendingApprovals();
  }

  @Patch('approval')
  @UseGuards(JwtAuthGuard)
  async approveOrReject(
    @Body() body: { type: 'Order' | 'Edit Request', id: number, status: 'Approved' | 'Rejected' }
  ) {
    return this.poService.approveOrReject(body);
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

  @Get('po-numberItem/:po_number')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_purchase_order')
   getItemBarName(@Param('po_number') po_number: string){
    return this.poService.getItemBarName(po_number);
  }
  

  @Get('status/ReadyForPaid')
  @UseGuards(JwtAuthGuard)
  @PermissionName('search_supplier-invoices')
  async getReadyForPaidInvoices() {
    return this.poService.getReadyForPaidInvoices();
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
  getByStatus(@Param('status') status: 'Pending'| 'Closed'| 'Rejected'| 'Draft'| 'Approved'| 'Sent' |'Incident'|'ReadyForPaid') {
    return this.poService.findByStatus(status);
  }

  @Patch(':po_number')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_purchase_order')
  async update(
    @Param('po_number') po_number: string,
    @Body() updateDto: Partial<CreatePurchaseOrderDto>,
    @Req() req: any  
  ) {
    try {
    
      const userId = req.user.userId;
      const userRole = req.user.role; 

      console.log("REQ USER:", req.user);
      const updated = await this.poService.update(po_number, updateDto, userId, userRole);

      await this.historyLogService.createLog({
        action: 'Purchase Order Updated',
        description: `PO with # ${po_number} updated successfully`,
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

  @Delete(':poNumber')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_purchase_order')
  async deleteById(@Param('poNumber') poNumber: string, @Req() req) {
    try {
      const result = await this.poService.deleteById(poNumber);

      await this.historyLogService.createLog({
        action: 'Purchase Order Deleted',
        description: `PO with # ${poNumber} deleted`,
        user: req.user.email,
        userRole: req.user.role,
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
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
        details: result.message,
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


@Post(':po_number/upload-file')
@UseGuards(JwtAuthGuard)
@PermissionName('upload_purchase_order_file')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/purchase-orders',
      filename: (req, file, cb) => {
        const ext = extname(file.originalname);
        const filename = `${req.params.po_number}${ext}`;
        cb(null, filename);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(
          new BadRequestException('Only PDF or Excel files are allowed!'),
          false
        );
      }

      cb(null, true);
    },
  })
)
async uploadFile(
  @Param('po_number') po_number: string,
  @UploadedFile() file: Express.Multer.File
) {
  if (!file) {
    throw new BadRequestException('No file uploaded!');
  }

  console.log("FILE RECEIVED:", file);
  console.log("PO Number:", po_number);

  return await this.poService.saveFilePath(po_number, file.path);
}



  @Get(':po_number/file')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_purchase_order_file')
  async getPurchaseOrderFile(
    @Param('po_number') po_number: string,
    @Query('type') type: 'pdf' | 'excel'
  ) {
    return this.poService.getFile(po_number, type);
  }





}