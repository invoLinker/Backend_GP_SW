import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InvoiceIncident } from './InvoiceIncident.model';
import { InvoiceIncidentModule } from './invoiceIncident.module';
import { InvoiceIncidentItem } from './InvoiceIncidentItem';

@Injectable()
export class SupplierIncidentService {
  constructor(
    @InjectModel(InvoiceIncident)
    private readonly incidentModel: typeof InvoiceIncident,

    @InjectModel(InvoiceIncidentItem)
    private readonly invoiceIncidentItem: typeof InvoiceIncidentItem,

  ) {}

  async getAllIncidents() {
    return this.incidentModel.findAll({
      include: [
        { model: this.invoiceIncidentItem, as: 'items' },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async updateIncidentStatus(id: number) {
    const incident = await this.incidentModel.findByPk(id);
    if (!incident) throw new NotFoundException('Incident not found');

    incident.status = 'Resolved';
    await incident.save();
    
    return { message: 'Incident checked successfully', incident };
  }
}
