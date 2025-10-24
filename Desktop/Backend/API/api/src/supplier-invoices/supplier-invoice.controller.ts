import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards,Request, Query } from '@nestjs/common';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { CreateSupplierInvoiceDto } from './SupplierInvoiceDto';
import { SupplierInvoiceItemDto } from './SupplierInvoiceItemDto';

@Controller('supplier-invoices')
export class SupplierInvoiceController {
  constructor(private readonly supplierInvoiceService: SupplierInvoiceService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_supplier-invoices')
  async createInvoice(@Body() body:  CreateSupplierInvoiceDto, @Request() req) {
   const userId = req.user.userId;
  return this.supplierInvoiceService.createInvoice(body, userId);
}

  @Get()
  @UseGuards(JwtAuthGuard)
  @PermissionName('search_supplier-invoices')
  async getAllInvoices(@Query('search') search?: string) {
    return this.supplierInvoiceService.getAllInvoices(search);
  }

  
  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('search_supplier-invoices')
  async getInvoicesByStatus(@Param('status') status: string) {
    return this.supplierInvoiceService.getInvoicesByStatus(status);
  }

  @Get('all')
  async getAllInvoicesOrderedByDate() {
    return this.supplierInvoiceService.getAllInvoicesOrderedByDate();
  }

//   @Put(':id')
//   async updateInvoice(
//     @Param('id', ParseIntPipe) id: number,
//     @Body() data: any,
//   ) {
//     return this.supplierInvoiceService.updateInvoice(id, data);
//   }

//   @Get()
//   async getAllInvoices() {
//     return this.supplierInvoiceService.getAllInvoices();
//   }

//   @Get(':id')
//   async getInvoiceById(@Param('id', ParseIntPipe) id: number) {
//     return this.supplierInvoiceService.getInvoiceById(id);
//   }

//   @Delete(':id')
//   async deleteInvoice(@Param('id', ParseIntPipe) id: number) {
//     return this.supplierInvoiceService.deleteInvoice(id);
//   }

//   @Put(':id/status')
//   async updateStatus(
//     @Param('id', ParseIntPipe) id: number,
//     @Body('status') status: string,
//   ) {
//     return this.supplierInvoiceService.updateStatus(
//       id,
//       status as any,
//     );
//   }
}
