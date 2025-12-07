import { Controller, Post, Body, Param, Req, Patch } from '@nestjs/common';
import { InvoiceService } from './verification.service';

@Controller('compare')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('invoices')
  async compareSI(@Body() body: { po_number: string;  cont?: Boolean  }) {
    const { po_number } = body;
    
    return await this.invoiceService.compareInvoices(po_number);    
  }

  @Post('DN')
  async compareDN(@Body('po_number') po_number: string, cont?: Boolean) {

    if(!cont){
        
    }
  return await this.invoiceService.compareDN(po_number);
  }

  @Post('GR')
  async compareGR(@Body('po_number') po_number: string) {
  return await this.invoiceService.compareGR(po_number);
  }


  @Patch('decision')
  async handleDecision(
    @Body() body: { po_number: string; stage: 'SI' | 'DN' | 'GR'; decision: boolean }
  ) {
    return await this.invoiceService.updateWorkflowState(
      body.po_number,
      body.stage,
      body.decision
    );
  }

}


