import { Controller, Post, Body, Param, Req, Patch , Request} from '@nestjs/common';
import { InvoiceService } from './verification.service';
import { HistoryLogService } from 'src/History/history-log.service';
import { HistoryCategory, HistorySeverity } from 'src/History/create-history-log.dto';

@Controller('compare')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService,
    private readonly historyLogService: HistoryLogService
  ) {}

  @Post('invoices')
  async compareSI(@Body() body: { po_number: string}, @Request() req) {
    const { po_number } = body;
        
    try {
          const result = await this.invoiceService.compareInvoices(po_number, req.user.userId);
    
          await this.historyLogService.createLog({
            action: 'Verification Between PO and Supplier Invoice',
            description: `Po with #${po_number} verified`,
            user: req.user?.email ?? 'Unknown',
            userRole: req.user?.role ?? 'Unknown',
            category: HistoryCategory.DATA,
            severity: HistorySeverity.SUCCESS,
            details: result,
          });
    
          return result;
        } catch (error) {
          await this.historyLogService.createLog({
            action: 'Verification Failed',
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

  @Post('DN')
  async compareDN(@Body('po_number') po_number: string, @Request() req) {
   try {
          const result = await this.invoiceService.compareDN(po_number, req.user.userId);
    
          await this.historyLogService.createLog({
            action: 'Verification Between PO and Delivery Note',
            description: `Po with #${po_number} verified`,
            user: req.user?.email ?? 'Unknown',
            userRole: req.user?.role ?? 'Unknown',
            category: HistoryCategory.DATA,
            severity: HistorySeverity.SUCCESS,
            details: result,
          });
    
          return result;
        } catch (error) {
          await this.historyLogService.createLog({
            action: 'Verification Failed',
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

  @Post('GR')
  async compareGR(@Body('po_number') po_number: string, @Request() req) {
  try {
          const result = await this.invoiceService.compareGR(po_number, req.user.userId);
    
          await this.historyLogService.createLog({
            action: 'Verification Between PO and Good Receipt',
            description: `Po with #${po_number} verified`,
            user: req.user?.email ?? 'Unknown',
            userRole: req.user?.role ?? 'Unknown',
            category: HistoryCategory.DATA,
            severity: HistorySeverity.SUCCESS,
            details: result,
          });
    
          return result;
        } catch (error) {
          await this.historyLogService.createLog({
            action: 'Verification Failed',
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


