import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { verification_exceptions } from './verification_exceptions.model';
import { NotificationService } from 'src/Notification/notification.service';
import { NotificationChannel, NotificationCategory } from 'src/Notification/create-notification.dto';
import { Role } from 'src/roles/roles.model';
import { User } from 'src/users/users.model';

@Injectable()
export class AuditExceptionService {
  constructor(
    @InjectModel(verification_exceptions)
    private exceptionModel: typeof verification_exceptions,
    private readonly notificationService: NotificationService

  ) {}

  async create(po_number: string, description: string, user_id: number) {

   const record = await this.exceptionModel.create({
      po_number,
      description,
      user_id,
    });

    try {
      const adminRole = await Role.findOne({ where: { role_name: 'Admin' } });

      if (adminRole) {
        const admins = await User.findAll({
          where: { role_id: adminRole.role_id },
        });

        for (const admin of admins) {
          await this.notificationService.sendNotification({
            title: 'New Audit Exception Submitted ⚠️',
            message: `A request review for PO ${po_number} needs attention.`,
            userId: admin.user_id.toString(),
            channel: NotificationChannel.IN_APP,
            category: NotificationCategory.SYSTEM,
            payload: { po_number },
          });
        }
      }
    } catch (err) {
      console.error('🔔 Failed to send admin notification:', err);
    }

    return record;
  }

  async getPending() {
    return await this.exceptionModel.findAll({
      where: { status: 'Pending' },
      order: [['createdAt', 'DESC']],
    });
  }

  async updateStatus(id: number, status: 'Approved' | 'Rejected') {
    const ex = await this.exceptionModel.findByPk(id);

    if (!ex) throw new NotFoundException('Exception not found');

    if (!['Approved', 'Rejected'].includes(status))
      throw new BadRequestException('Invalid status');

    ex.status = status;

    await ex.save();

     try {
      const requester = await User.findByPk(ex.user_id);

      if (requester) {
        await this.notificationService.sendNotification({
          title: `Audit Exception ${status}`,
          message: `Your audit exception for PO ${ex.po_number} has been ${status}.`,
          userId: requester.user_id.toString(),
          channel: NotificationChannel.IN_APP,
          category: NotificationCategory.SYSTEM,
          payload: { po_number: ex.po_number, status },
        });
      }
    } catch (err) {
      console.error('🔔 Failed to notify requester:', err);
    }

    return {
    message: status === 'Approved'
        ? 'verification_exceptions Approved'
        : 'verification_exceptions Rejected'
    };
  }
}
