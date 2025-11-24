import {Controller,Get,Patch,Param,Request,UseGuards, Delete,} from '@nestjs/common';
import { SupplierIncidentService } from './invoiceIncident.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';


@Controller('supplier-incident')
export class SupplierIncidentController {
  constructor(private readonly incidentService: SupplierIncidentService,
              private readonly historyLogService: HistoryLogService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllIncidents() {
    return this.incidentService.getAllIncidents();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateIncidentStatus(
    @Param('id') id: number, @Request() req
  ) {
     try {
      const result = await this.incidentService.updateIncidentStatus(id);

      await this.historyLogService.createLog({
        action: 'Invoice Incident Updated',
        description: `Invoice Incident with id=${id} updated`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details:  result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Invoice Incident Updated Failed',
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

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteIncident(@Param('id') id: number, @Request() req) {
    try {
      const result = await this.incidentService.deleteIncident(id);

      await this.historyLogService.createLog({
        action: 'Invoice Incident Deleted',
        description: `Invoice Incident with id=${id} deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;

    } catch (error) {

      await this.historyLogService.createLog({
        action: 'Invoice Incident Delete Failed',
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

}
   