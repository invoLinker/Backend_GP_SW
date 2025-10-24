import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query, Patch } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { Supplier } from './supplier.model';
import { PermissionsGuard } from '../permission/PermissionsGuard';
import { PermissionName } from '../permission/permission.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateSupplierDto } from './CreateSupplierDto';
import { UpdateSupplierDto } from './UpdateSupplierDto';

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @PermissionName("get_all_supplier") 
  findAll(): Promise<Supplier[]> {
    return this.supplierService.findAll();
  }

    @Get('name/:name')
    @UseGuards(JwtAuthGuard)
    @PermissionName("get_supplier_by_name") 
    searchByName(@Param('name') name: string): Promise<Supplier[]> {
    return this.supplierService.searchByName(name);
    }


    @Get('email/:email')
    @UseGuards(JwtAuthGuard)
    @PermissionName("get_supplier_by_email") 
    searchByEmail(@Param('email') email: string): Promise<Supplier[]> {
    return this.supplierService.searchByEmail(email);
    }


    @Post()
    @UseGuards(JwtAuthGuard)
    @PermissionName("add_supplier") 
    create(@Body() data: CreateSupplierDto): Promise<Supplier> {
        return this.supplierService.create(data);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @PermissionName('update_supplier')
    async updateSupplier(
    @Param('id') id: number,
    @Body() dto: UpdateSupplierDto,
    ) {
    return await this.supplierService.update(id, dto);
    }


  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_supplier')
  deleteById(@Param('id') id: number) {
    return this.supplierService.deleteById(id);
  }

  @Delete('by-name/:name')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_supplier')
  deleteByName(@Param('name') name: string) {
    return this.supplierService.deleteByName(name);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_supplier')
  deleteAll() {
    return this.supplierService.deleteAll();
  }
}
