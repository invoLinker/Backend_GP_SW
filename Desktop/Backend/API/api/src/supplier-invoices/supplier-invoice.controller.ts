import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards,Request,UploadedFile, Query, Patch, UseInterceptors, BadRequestException } from '@nestjs/common';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { CreateSupplierInvoiceDto } from './SupplierInvoiceDto';
import { SupplierInvoiceItemDto } from './SupplierInvoiceItemDto';
import { FileInterceptor } from '@nestjs/platform-express';

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

    @Post('upload-image/:id')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('invoice_image'))
    async updateUser(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() invoice_image: Express.Multer.File,
    ) {
        return this.supplierInvoiceService.saveInvoiceImage(invoice_image , id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async updateInvoice(
    @Param('id') id: number,
    @Body() data: CreateSupplierInvoiceDto,@Request() req,
    ) {
        const userId = req.user.userId;         
        return this.supplierInvoiceService.updateInvoice(id, data, userId);
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


  @Delete(':id')
  async deleteInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.supplierInvoiceService.deleteInvoiceById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateInvoiceStatus(
  @Param('id') id: number,
  @Body('status') status: string,
  ): Promise<any> {
  return this.supplierInvoiceService.updateStatus(id, status);
  }

}
