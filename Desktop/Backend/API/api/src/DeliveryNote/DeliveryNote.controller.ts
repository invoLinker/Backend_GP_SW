import { Controller, Post, Body, Get, Query, UsePipes, ValidationPipe,ParseIntPipe, UseGuards, Request, Param, Patch, BadRequestException, UploadedFile, UseInterceptors, Delete } from '@nestjs/common';
import { DeliveryNoteService } from './DeliveryNote.service';
import { CreateDeliveryNoteDto } from './DeliveryNoteDTO';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { request } from 'node:http';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('delivery-notes')
export class DeliveryNoteController {
  constructor(private readonly service: DeliveryNoteService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @PermissionName('create_supplier-invoices')
    async create(@Body() body:  CreateDeliveryNoteDto, @Request() req) {
    const userId = req.user.userId;
    return this.service.createDeliveryNote(body, userId);
     }

     
    @Post('upload-image/:id')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('DN_image'))
    async updateUser(
        @Param('id', ParseIntPipe) id: number,
        @UploadedFile() DN_image: Express.Multer.File,
    ) {
        return this.service.saveInvoiceImage(DN_image , id);
    }


    @Get()
    @UseGuards(JwtAuthGuard)
    @PermissionName('get_supplier-invoices')
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

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async replaceIncident(
    @Param('id') id: number,
    @Body() body: CreateDeliveryNoteDto, 
    @Request() req,
  ) {
    const userId = req.user.userId;

    return this.service.UpdateDN(+id, body, userId);
  }

  @Delete(':id')
  async deleteInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteInvoiceById(id);
  }

  
}
