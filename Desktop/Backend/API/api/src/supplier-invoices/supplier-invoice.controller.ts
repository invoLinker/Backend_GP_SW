import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards,Request,UploadedFile, Query, Patch, UseInterceptors, BadRequestException } from '@nestjs/common';
import { SupplierInvoiceService } from './supplier-invoice.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { CreateSupplierInvoiceDto } from './SupplierInvoiceDto';
import { SupplierInvoiceItemDto } from './SupplierInvoiceItemDto';
import { FileInterceptor } from '@nestjs/platform-express';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';


@Controller('supplier-invoices')
export class SupplierInvoiceController {
  constructor(private readonly supplierInvoiceService: SupplierInvoiceService,
              private readonly historyLogService: HistoryLogService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_supplier-invoices')
  @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: './uploads/supplier-invoices',
          filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const finalName = `${req.body.invoice_number}${ext}`;
          cb(null, finalName);
        }
        }),
      })
    )
  async createInvoice(@Body() body:  CreateSupplierInvoiceDto, @UploadedFile() file: Express.Multer.File, @Request() req) {
    try {
      const userId = req.user.userId;
      const result = await this.supplierInvoiceService.createInvoice(body, userId ,file);

      await this.historyLogService.createLog({
        action: 'Supplier Invoice Created',
        description: `Invoice number=${body.invoice_number} created`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Supplier Invoice Creation Failed',
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

  @Post('upload-file/:invoice_number')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/supplier-invoices',
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const finalName = `${req.params.invoice_number}${ext}`;
          cb(null, finalName);
        }
      }),
    })
  )
  async uploadImage(
    @Param('invoice_number') invoice_number: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    try {
      const result = await this.supplierInvoiceService.saveInvoiceImage(file.path, invoice_number);

      await this.historyLogService.createLog({
        action: 'Invoice Image Uploaded',
        description: `Invoice #${invoice_number} image uploaded`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;

    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Invoice Image Upload Failed',
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


  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: './uploads/supplier-invoices',
          filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const finalName = `${req.body.invoice_number}${ext}`;
          cb(null, finalName);
        }
        }),
      })
    )
  async updateInvoice(
    @Param('id') id: number,
    @Body() data: CreateSupplierInvoiceDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.supplierInvoiceService.updateInvoice(id, data, userId, file);

      await this.historyLogService.createLog({
        action: 'Supplier Invoice Updated',
        description: `Invoice id=${id} updated`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Supplier Invoice Update Failed',
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
  @PermissionName('search_supplier-invoices')
  async getAllInvoices(@Query('search') search?: string) {
    return this.supplierInvoiceService.getAllInvoices(search);
  }

  // @Get('si-numberItem/:si_number')
  // @UseGuards(JwtAuthGuard)
  // @PermissionName('get_supplier_invoice_item')
  // getItemBarName(@Param('si_number') si_number: string){
  //   return this.supplierInvoiceService.getItemBarName(si_number);
  // }
  

  @Get('all')
  @UseGuards(JwtAuthGuard)
  async getAllInvoicesOrderedByDate() {
    return this.supplierInvoiceService.getAllInvoicesOrderedByDate();
  }


  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteInvoice(@Param('id', ParseIntPipe) id: number, @Request() req) {
    try {
      const result = await this.supplierInvoiceService.deleteInvoiceById(id);

      await this.historyLogService.createLog({
        action: 'Supplier Invoice Deleted',
        description: `Invoice id=${id} deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.WARNING,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Supplier Invoice Deletion Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: { id },
      });
      throw error;
    }
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateInvoiceStatus(
    @Param('id') id: number,
    @Body('status') status: string,
    @Request() req
  ): Promise<any> {
    try {
      const result = await this.supplierInvoiceService.updateStatus(id, status);

      await this.historyLogService.createLog({
        action: 'Supplier Invoice Status Updated',
        description: `Invoice id=${id} status changed to ${status}`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Update Invoice Status Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: { id, status },
      });
      throw error;
    }
  }

  @Get(':invoice_number/file')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_supplier_invoice_file')
  async getPurchaseOrderFile(
    @Param('invoice_number') invoice_number: string,
    @Query('type') type: 'pdf' | 'excel' | 'img'
  ) {
    return this.supplierInvoiceService.getFile(invoice_number, type);
  }
}
