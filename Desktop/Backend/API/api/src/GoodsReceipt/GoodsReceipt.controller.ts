// src/controllers/goods-receipt.controller.ts
import { Body, Controller, Post, UseGuards, Request, Get, Query, Param } from '@nestjs/common';
import { GoodsReceiptService } from './GoodsReceipt.service';
import { CreateGoodsReceiptDto } from './GoodsReceiptDto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';

@Controller('goods-receipts')
export class GoodsReceiptController {
  constructor(private readonly grService: GoodsReceiptService) {}
  @Post()
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_supplier-invoices')
  async create(@Body() body:  CreateGoodsReceiptDto, @Request() req) {
  const userId = req.user.userId;
  return this.grService.createGR(body, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_supplier-invoices')
  async getAll() {
    return this.grService.getAll();
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_supplier-invoices')
  async getByStatus(@Param('status') status: string) {
    return this.grService.getByStatus(status);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_supplier-invoices')
  async search(@Query('q') keyword: string) {
    return this.grService.search(keyword);
  }
}
