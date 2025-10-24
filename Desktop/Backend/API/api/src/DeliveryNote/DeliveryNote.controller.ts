import { Controller, Post, Body, Get, Query, UsePipes, ValidationPipe,ParseIntPipe, UseGuards, Request, Param, Patch, BadRequestException } from '@nestjs/common';
import { DeliveryNoteService } from './DeliveryNote.service';
import { CreateDeliveryNoteDto } from './DeliveryNoteDTO';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { request } from 'node:http';

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

    @Patch(':dn_number')
    @UseGuards(JwtAuthGuard)
    @PermissionName('update_supplier-invoices')
    async updateDeliveryNote(
    @Param('dn_number') dn_number: string,
    @Body() updateDto: any,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.service.updateDeliveryNote(dn_number, updateDto, userId);
  }

  
}
