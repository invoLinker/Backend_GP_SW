import { Controller, Post, Body, Get, Query, UsePipes, ValidationPipe,ParseIntPipe, UseGuards, Request, Param, Patch, BadRequestException, UploadedFile, UseInterceptors, Delete } from '@nestjs/common';
import { DeliveryNoteService } from './DeliveryNote.service';
import { CreateDeliveryNoteDto } from './DeliveryNoteDTO';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { request } from 'node:http';
import { FileInterceptor } from '@nestjs/platform-express';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';


@Controller('delivery-notes')
export class DeliveryNoteController {
  constructor(private readonly service: DeliveryNoteService,
              private readonly historyLogService: HistoryLogService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_supplier-invoices')
  async create(@Body() body: CreateDeliveryNoteDto, @Request() req) {
    const userId = req.user.userId;

    try {
      const note = await this.service.createDeliveryNote(body, userId);
      await this.historyLogService.createLog({
        action: 'Delivery Note Created',
        description: `DN with id=${note!.dn_number} created`,
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



     
  @Post('upload-image/:id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() DN_image: Express.Multer.File,
    @Request() req
  ) {
    try {
      const result = await this.service.saveInvoiceImage(DN_image, id);

      await this.historyLogService.createLog({
        action: 'Delivery Note Image Uploaded',
        description: `Image uploaded for DN with id=${id}`,
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
  async replaceIncident(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateDeliveryNoteDto,
    @Request() req
  ) {
    try {
      const note = await this.service.UpdateDN(+id, body, req.user.userId);

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
}