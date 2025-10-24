import { Controller, Post, Body, UseGuards, Get , Param, Patch, Delete, Query, Req} from '@nestjs/common';
import { PurchaseOrderService } from './po.service';
import { CreatePurchaseOrderDto } from './CreatePurchaseOrderDto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../permission/PermissionsGuard';
import { PurchaseOrder } from './po.model';
import { PermissionName } from 'src/permission/permission.decorator';

@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_purchase_order')
  async create(@Body() createPoDto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    return this.poService.create(createPoDto);
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
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreatePurchaseOrderDto>,
    @Req() req: any  
  ) {
    const userId = req.user.userId; 
    return this.poService.update(+id, updateDto, userId);
  }



  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_purchase_order')
    async deleteById(@Param('id') id: string) {
    return this.poService.deleteById(Number(id));
  }

  // Delete all Purchase Orders
  @Delete()
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_purchase_order')
    async deleteAll() {
    return this.poService.deleteAll();
  }

  // Delete by Supplier ID
  @Delete('supplier/:supplierId')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_purchase_order')
    async deleteBySupplier(@Param('supplierId') supplierId: string) {
    return this.poService.deleteBySupplierId(Number(supplierId));
  }

  // Delete by Status
  @Delete('status/:status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_purchase_order')
    async deleteByStatus(@Param('status') status: string) {
    return this.poService.deleteByStatus(status);
  }
  
}
