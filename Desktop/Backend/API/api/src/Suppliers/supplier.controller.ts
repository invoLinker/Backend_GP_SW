import { Controller, Patch, Param, Body, UseGuards, Get, Query } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { CreatSupplierDTO } from './CreatSupplierDTO';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Patch(':id/bank-info')
  @UseGuards(JwtAuthGuard)
  async updateBankInfo(
    @Param('id') supplier_id: number,
    @Body() dto: CreatSupplierDTO
  ) {
    return this.supplierService.updateBankInfo(supplier_id, dto);
  }

  @Get('bank-info/:supplier_id')
  @UseGuards(JwtAuthGuard)
  async getBankInfo(
    @Param('supplier_id') supplier_id: number,
  ) {
    return this.supplierService.getBankInfo(supplier_id);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  async supplierPaymentSummary(
    @Query('id') id: number,
  ) {
    return this.supplierService.supplierPaymentSummary(id);
  }
}
