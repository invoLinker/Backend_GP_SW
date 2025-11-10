// src/controllers/goods-receipt.controller.ts
import { Body, Controller, Post, UseGuards, Request, Get, Query, Param, Delete, Patch } from '@nestjs/common';
import { GoodsReceiptService } from './GoodsReceipt.service';
import { CreateGoodsReceiptDto } from './GoodsReceiptDto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';

@Controller('goods-receipts')
export class GoodsReceiptController {
  constructor(private readonly grService: GoodsReceiptService) {}
  @Post()
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_delivery_note')
  async create(@Body() body:  CreateGoodsReceiptDto, @Request() req) {
  const userId = req.user.userId;
  return this.grService.createGR(body, userId);
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
  async updateGR(@Param('id') id: number, @Body() dto: CreateGoodsReceiptDto) {
    return this.grService.updateGR(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_delivery_note')
  async deleteGR(@Param('id') id: number) {
    return this.grService.deleteGR(id);
  }
}
