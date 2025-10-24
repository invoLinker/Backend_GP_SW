// src/stock/stock.controller.ts
import { Controller, Get, Post, Body, Param, Query, Delete, UseGuards, Patch } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './CreateStockDto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { UpdateStockDto } from './UpdateStockDTO';
import { FilterStockDto } from './FilterStockDto';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post(':inv_id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_stock')
  create(@Param('inv_id') inv_id: number) {
    return this.stockService.create(inv_id);
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
  update( @Body() updateStockDto: UpdateStockDto) {
    return this.stockService.takeFromStockByName(updateStockDto.product_name!, updateStockDto.quantity!);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_stock')
  updateState(@Param('id')  id: number, @Body() updateStockDto: UpdateStockDto) {
    return this.stockService.updateStockState(id, updateStockDto.status!);
  }

  @Patch('date/:id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_stock')
  updateDate(@Param('id')  id: number, @Body() updateStockDto: UpdateStockDto) {
    return this.stockService.updateStockExpiration(id, updateStockDto.expiration_date!);
  }

 
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_stock')
  async remove(@Param('id') stockId: number) {
    return this.stockService.deleteStock(stockId);
  }
}
