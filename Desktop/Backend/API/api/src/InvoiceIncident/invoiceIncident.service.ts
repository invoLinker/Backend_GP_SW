import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InvoiceIncident } from './InvoiceIncident.model';
import { InvoiceIncidentModule } from './invoiceIncident.module';
import { InvoiceIncidentItem } from './InvoiceIncidentItem';
import { NotificationService } from 'src/Notification/notification.service';
import {NotificationCategory, NotificationChannel} from '../Notification/create-notification.dto'
import { User } from 'src/users/users.model';
import { Role } from 'src/roles/roles.model';


@Injectable()
export class SupplierIncidentService {
  constructor(
    @InjectModel(InvoiceIncident)
    private readonly incidentModel: typeof InvoiceIncident,
    @InjectModel(InvoiceIncidentItem)
    private readonly invoiceIncidentItem: typeof InvoiceIncidentItem,
    @InjectModel(User)private userModel: typeof User,
    private readonly notificationService: NotificationService
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

    await this.notifyAdmins(
      'Incident Updated',
      `Incident ${incident.invoice_number} status changed to ${incident.status!}.`
    );

    await this.notifyUser(
      incident.created_by!,
      'Your Incident Updated',
      `Your incident ${incident.invoice_number} status is now ${incident.status!}.`
    );
    
    return { message: 'Incident checked successfully' };
  }

  async deleteIncident(id: number) {
  const incident = await this.incidentModel.findByPk(id);

  if (!incident) throw new NotFoundException('Incident not found');

  await this.invoiceIncidentItem.destroy({
    where: { incident_id: id }
  });

  await incident.destroy();

  return { message: 'Incident deleted successfully' };
}


 private async notifyAdmins(title: string, message: string) {
    const admins = await this.userModel.findAll({ include: [{ model: Role, where: { role_name: 'Admin' } }], });
    for (const admin of admins) {
      await this.notificationService.sendNotification({
        title,
        message,
        userId: admin.user_id.toString(),
        channel: NotificationChannel.IN_APP,
        category: NotificationCategory.SYSTEM,
        payload: {},
      });
    }
  }

  private async notifyUser(userId: number, title: string, message: string) {
    const user = await this.userModel.findByPk(userId);
    if (user) {
      await this.notificationService.sendNotification({
        title,
        message,
        userId: user.user_id.toString(),
        channel: NotificationChannel.IN_APP,
        category: NotificationCategory.SYSTEM,
        payload: {},
      });
    }
  }

}
