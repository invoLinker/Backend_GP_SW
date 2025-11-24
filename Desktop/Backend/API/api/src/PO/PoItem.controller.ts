import { Controller, Post, Body, Param, Get, Delete, ParseIntPipe, UseGuards, Patch, Req } from '@nestjs/common';
import { PurchaseOrderItemService } from './PoItem.service';
import { CreatePurchaseOrderItemDto } from './CreatePurchaseOrderItemDto';
import { PermissionName } from 'src/permission/permission.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { EditRequest } from 'src/edit_requests/edit_requests.model';
import { DeleteItemsDto } from './DeleteItemsDto';
import { PurchaseOrder } from './po.model';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';

@Controller('purchase-order-items')
export class PurchaseOrderItemController {
  constructor(private readonly itemService: PurchaseOrderItemService,
              private readonly historyLogService: HistoryLogService,

  ) {}

  @Post(':po_id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_purchase_order_item')
  async create( @Param('po_id', ParseIntPipe) po_id: number, @Body() dto: CreatePurchaseOrderItemDto, @Req() req: any ) {
    try {
          const userId = req.user.userId; 
          const po = await this.itemService.createItem(po_id, dto, userId );
    
          await this.historyLogService.createLog({
            action: 'Purchase Order Item Created',
            description: `Item for PO with ID ${po_id} created successfully`,
            user: req.user?.email ?? 'Unknown',
            userRole: req.user?.role ?? 'Unknown',
            category: HistoryCategory.DATA,
            severity: HistorySeverity.SUCCESS,
            details: po,
          });
    
          return po;
        } catch (error) {
          await this.historyLogService.createLog({
            action: 'Purchase Order Item Creation Failed',
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
    
    
  

  @Get('po/:poId')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_purchase_order_item')
  getItemsByPoId(@Param('poId', ParseIntPipe) poId: number) {
    return this.itemService.getItemsByPoId(poId);
  }

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
  try {

          const userId = req.user.userId; 
          const po = await this.itemService.updateItem(id, body, userId);
          await this.historyLogService.createLog({
            action: 'Item Updated',
            description: `Item with ID ${id} updated successfully`,
            user: req.user?.email ?? 'Unknown',
            userRole: req.user?.role ?? 'Unknown',
            category: HistoryCategory.DATA,
            severity: HistorySeverity.SUCCESS,
            details: po,
          });
    
          return po;
        } catch (error) {
          await this.historyLogService.createLog({
            action: 'Item Updated Failed',
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
  @PermissionName('delete_po_item')
  async deleteItems(
    @Param('id') id: number,
    @Body() deleteItemsDto: DeleteItemsDto, 
    @Req() req: any
  ): Promise<PurchaseOrder | EditRequest> {
    try {
          const userId = req.user.userId; 
          const po = await this.itemService.deleteItems(id,deleteItemsDto.itemIds, userId);
          await this.historyLogService.createLog({
            action: 'Item Deletion',
            description: `Item with ID ${id} deleleted successfully`,
            user: req.user?.email ?? 'Unknown',
            userRole: req.user?.role ?? 'Unknown',
            category: HistoryCategory.DATA,
            severity: HistorySeverity.SUCCESS,
            details: po,
          });
    
          return po;
        } catch (error) {
          await this.historyLogService.createLog({
            action: 'Item Deleted Failed',
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


