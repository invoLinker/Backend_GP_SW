// // src/controllers/verification.controller.ts
// import { Controller, Post, Param, Req, UseGuards } from '@nestjs/common';
// import { VerificationService } from './verification.service';
// import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
// import { PermissionName } from 'src/permission/permission.decorator';

// @Controller('verification')
// export class VerificationController {
//   constructor(private readonly verificationService: VerificationService) {}

//   @Post('DN/:dn_number')
//   @UseGuards(JwtAuthGuard)
//   @PermissionName('verification_dn_gr')
//   async verifyDeliveryNote(@Param('dn_number') dn_number: string, @Req() req) {
//     const userId = req.user.userId;

//     const result = await this.verificationService.verifyPODeliveryNotes(dn_number, userId);
//     return result;
//   }

//   @Post('PO/:po_number')
//   @UseGuards(JwtAuthGuard)
//   @PermissionName('verification_po_si')
//   async verifyPO(@Param('po_number') po_number: string, @Req() req) {
//     const userId = req.user.userId;

//     const result = await this.verificationService.verifyPOInvoices(po_number, userId);
//     return result;
//   }

//   @Post('DNGR/:po_number')
//   @UseGuards(JwtAuthGuard)
//   @PermissionName('verification_po_si')
//   async verifyDeliveryGoods(@Param('po_number') po_number: string, @Req() req) {
//     const userId = req.user.userId;

//     const result = await this.verificationService.verifyDeliveryGoods(po_number, userId);
//     return result;
//   }

//   @Post('GR/:po_number')
//   @UseGuards(JwtAuthGuard)
//   @PermissionName('verification_po_si')
//   async verifyPOGoodsReceipts(@Param('po_number') po_number: string, @Req() req) {
//     const userId = req.user.userId;

//     const result = await this.verificationService.verifyPOGoodsReceipts(po_number, userId);
//     return result;
//   }

// }

import { Controller, Post, Body, Param, Req } from '@nestjs/common';
import { InvoiceService } from './verification.service';

@Controller('compare')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('invoices')
  async compareSI(@Body('po_number') po_number: string) {
  return await this.invoiceService.compareInvoices(po_number);
  }

  @Post('DN')
  async compareDN(@Body('po_number') po_number: string) {
  return await this.invoiceService.compareDN(po_number);
  }

  @Post('GR')
  async compareGR(@Body('po_number') po_number: string) {
  return await this.invoiceService.compareGR(po_number);
  }

}

