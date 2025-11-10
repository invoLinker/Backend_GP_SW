import {Controller,Get,Patch,Param,Body,UseGuards,} from '@nestjs/common';
import { SupplierIncidentService } from './invoiceIncident.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('supplier-incident')
export class SupplierIncidentController {
  constructor(private readonly incidentService: SupplierIncidentService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllIncidents() {
    return this.incidentService.getAllIncidents();
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateIncidentStatus(
    @Param('id') id: number,
  ) {
    return this.incidentService.updateIncidentStatus(id);
  }
}
