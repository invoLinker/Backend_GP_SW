import { Controller, Post, Body, Get, Query, UsePipes, ValidationPipe,ParseIntPipe, UseGuards, Request, Param, Patch, BadRequestException, UploadedFile, UseInterceptors, Delete } from '@nestjs/common';
import { DeliveryNoteService } from './DeliveryNote.service';
import { CreateDeliveryNoteDto } from './DeliveryNoteDTO';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { request } from 'node:http';
import { FileInterceptor } from '@nestjs/platform-express';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';



@Controller('delivery-notes')
export class DeliveryNoteController {
  constructor(private readonly service: DeliveryNoteService,
              private readonly historyLogService: HistoryLogService
  ) {}

  // @Post()
  // @UseGuards(JwtAuthGuard)
  // @PermissionName('create_supplier-invoices')
  // async create(@Body() body: CreateDeliveryNoteDto, @Request() req) {
  //   const userId = req.user.userId;

  //   try {
  //     const note = await this.service.createDeliveryNote(body, userId);
  //     await this.historyLogService.createLog({
  //       action: 'Delivery Note Created',
  //       description: `DN with #${body.dn_number} created`,
  //       user: req.user?.email ?? 'Unknown',
  //       userRole: req.user?.role ?? 'Unknown',
  //       category: HistoryCategory.DATA,
  //       severity: HistorySeverity.SUCCESS,
  //       details: note,
  //     });

  //     return note;

  //   } catch (error) {
  //     await this.historyLogService.createLog({
  //       action: 'Delivery Note Creation Failed',
  //       description: error.message,
  //       user: req.user?.email ?? 'Unknown',
  //       userRole: req.user?.role ?? 'Unknown',
  //       category: HistoryCategory.DATA,
  //       severity: HistorySeverity.ERROR,
  //       details: error,
  //     });

  //     throw error;
  //   }
  // }


  @Post()
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_supplier-invoices')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/DN',
        filename: (req, file, cb) => {
        const ext = extname(file.originalname);
        const finalName = `${req.body.dn_number}${ext}`;
        cb(null, finalName);
      }
      }),
    })
  )
  async create(
    @Body() body: CreateDeliveryNoteDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    const userId = req.user.userId;

    try {
      const note = await this.service.createDeliveryNote(body, userId, file);

      await this.historyLogService.createLog({
        action: 'Delivery Note Created',
        description: `DN with #${body.dn_number} created`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: note,
      });

      return note;

    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delivery Note Creation Failed',
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



     
  @Post('upload-file/:dn_number')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/DN',
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const finalName = `${req.params.dn_number}${ext}`;
          cb(null, finalName);
        }
      }),
    })
  )
  async UploadImg(
    @Param('dn_number') dn_number: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    try {
      const result = await this.service.saveInvoiceImage(file.path, dn_number);

      await this.historyLogService.createLog({
        action: 'Delivery Note Image Uploaded',
        description: `Image uploaded for DN with #${dn_number}`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: { result },
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delivery Note Image Upload Failed',
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
    @PermissionName('get_DN')
    async getAll() {
        return this.service.getAll();
    }

    @Get('status/:status')
    @UseGuards(JwtAuthGuard)
    @PermissionName('get_supplier-invoices')
    async getByStatus(@Param('status') status: string) {
        return this.service.getByStatus(status);
    }

    @Get('search')
    @UseGuards(JwtAuthGuard)
    @PermissionName('search_supplier-invoices')
    async search(@Query('q') q: string) {
        return this.service.search(q);
    }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination: './uploads/DN',
          filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          const finalName = `${req.body.invoice_number}${ext}`;
          cb(null, finalName);
        }
        }),
      })
    )
  async replaceIncident(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateDeliveryNoteDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    try {
      const note = await this.service.UpdateDN(+id, body, req.user.userId, file);

      await this.historyLogService.createLog({
        action: 'Update Delivery Note',
        description: `DN with id=${id} updated`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: note,
      });

      return note;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Update Delivery Note Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: { id, body },
      });
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteInvoice(@Param('id', ParseIntPipe) id: number, @Request() req) {
    try {
      const result = await this.service.deleteInvoiceById(id);

      await this.historyLogService.createLog({
        action: 'Delete Delivery Note',
        description: `DN with id=${id} deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details:  result ,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delete Delivery Note Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details:  error ,
      });
      throw error;
    }
  }

  @Get(':dn_number/file')
    @UseGuards(JwtAuthGuard)
    @PermissionName('get_supplier_invoice_file')
    async getPurchaseOrderFile(
      @Param('dn_number') dn_number: string,
      @Query('type') type: 'pdf' | 'excel' | 'img'
    ) {
      return this.service.getFile(dn_number, type);
    }
}