import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InvoiceIncident } from './InvoiceIncident.model';
import { InvoiceIncidentModule } from './invoiceIncident.module';
import { InvoiceIncidentItem } from './InvoiceIncidentItem';
import { NotificationService } from 'src/Notification/notification.service';
import {NotificationCategory, NotificationChannel} from '../Notification/create-notification.dto'
import { User } from 'src/users/users.model';


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
      `Incident ${incident.id} status changed to ${status}.`
    );

    await this.notifyUser(
      incident.created_by!,
      'Your Incident Updated',
      `Your incident ${incident.id} status is now ${status}.`
    );
    
    return { message: 'Incident checked successfully', incident };
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
    const admins = await this.userModel.findAll({ where: { role: 'Admin' } });
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
