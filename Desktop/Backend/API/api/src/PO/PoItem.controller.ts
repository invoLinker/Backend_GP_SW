import { Controller, Post, Body, Param, Get, Delete, ParseIntPipe, UseGuards, Patch, Req } from '@nestjs/common';
import { PurchaseOrderItemService } from './PoItem.service';
import { CreatePurchaseOrderItemDto } from './CreatePurchaseOrderItemDto';
import { PermissionName } from 'src/permission/permission.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { EditRequest } from 'src/edit_requests/edit_requests.model';
import { DeleteItemsDto } from './DeleteItemsDto';
import { PurchaseOrder } from './po.model';

@Controller('purchase-order-items')
export class PurchaseOrderItemController {
  constructor(private readonly itemService: PurchaseOrderItemService) {}

  @Post(':po_id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_purchase_order_item')
  create( @Param('po_id', ParseIntPipe) po_id: number, @Body() dto: CreatePurchaseOrderItemDto, @Req() req: any ) {
    const userId = req.user.userId; 
    return this.itemService.createItem(po_id, dto, userId );
  }

  @Get('po/:poId')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_purchase_order_item')
  getItemsByPoId(@Param('poId', ParseIntPipe) poId: number) {
    return this.itemService.getItemsByPoId(poId);
  }

  // جلب عنصر محدد
  @Get(':itemId')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_purchase_order_item')
  getItemById(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.itemService.getItemById(itemId);
  }

  @Get()
  async getAll() {
    return await this.itemService.getAll();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_purchase_order_item')
  async update(@Param('id') id: number, @Body() body: any, @Req() req: any ) {
    const userId = req.user.userId; 
    return await this.itemService.updateItem(id, body, userId);
  }

  
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_po_item')
  async deleteItems(
    @Param('id') id: number,
    @Body() deleteItemsDto: DeleteItemsDto, 
    @Req() req: any
  ): Promise<PurchaseOrder | EditRequest> {
    const userId = req.user.userId; 
    return this.itemService.deleteItems(id,deleteItemsDto.itemIds, userId);
  }

  
}


