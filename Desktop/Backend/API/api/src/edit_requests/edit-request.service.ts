import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EditRequest } from './edit_requests.model';
import { PurchaseOrder } from 'src/PO/po.model';
import { User } from 'src/users/users.model';
import { UpdateEditRequestDto } from './UpdateEditRequestDto';
import { NotificationService } from 'src/Notification/notification.service';
import {NotificationCategory, NotificationChannel} from '../Notification/create-notification.dto'
import { PurchaseOrderService } from 'src/PO/po.service';
import { Sequelize } from 'sequelize-typescript';


@Injectable()
export class EditRequestService {
  constructor(
  @InjectModel(EditRequest)
  private editRequestModel: typeof EditRequest,

  @Inject(Sequelize)
  private  sequelize: Sequelize,

  @Inject(forwardRef(() => PurchaseOrderService))
  private readonly purchaseOrderService: PurchaseOrderService,

  private readonly notificationService: NotificationService
) {}



 async findAll(): Promise<EditRequest[]> {
    try {
      return await this.editRequestModel.findAll({
        include: [
          { model: PurchaseOrder, as: 'invoice' },
          { model: User, as: 'user' },
        ],
        order: [['createdAt', 'DESC']],
      });
    } catch (error) {
      console.error('Error fetching EditRequests:', error);
      throw new InternalServerErrorException('Failed to fetch edit requests');
    }
  }

async findByStatus(status: 'Pending' | 'Approved' | 'Rejected'): Promise<EditRequest[]> {
  try {
    const requests = await this.editRequestModel.findAll({
      where: { status },
      include: [
        { model: PurchaseOrder, as: 'invoice' },
        { model: User, as: 'user' },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (!requests || requests.length === 0) {
      throw new NotFoundException(`No EditRequests found with status "${status}"`);
    }

    return requests;
  } catch (error) {
    console.error('Error fetching EditRequests by status:', error);
    if (error instanceof NotFoundException) throw error;
    throw new InternalServerErrorException('Failed to fetch edit requests by status');
  }
}





async update(id: number, data: UpdateEditRequestDto) {
  const request = await this.editRequestModel.findByPk(id, {
    include: [
      { model: PurchaseOrder, as: 'invoice' },
      { model: User, as: 'user' }
    ]
  });

  if (!request) throw new NotFoundException('Request not found');

  const po_id = request.invoice_id;

  const po= await PurchaseOrder.findByPk(po_id);
  if(!po){
    throw new NotFoundException("PO not found");
  }

  if (data.status === 'Rejected') {
    request.status = 'Rejected';
    await request.save();

    if (request.user_id) {
      await this.notificationService.sendNotification({
        title: `Edit Request Rejected`,
        message: `Your edit request for purchase order #${po.po_number} has been Rejected.`,
        userId: request.user_id.toString(),
        channel: NotificationChannel.IN_APP,
        category: NotificationCategory.SYSTEM,
        payload: {
          editRequestId: request.id?.toString() ?? id.toString(),
          poNumber: po.po_number,
          status: 'Rejected',
        },
      });
    }
    
    return request;
  }


if (data.status === 'Approved') {

  const rawMessage = request.message;
  const jsonStart = rawMessage.indexOf('{');

  if (jsonStart === -1) {
    throw new BadRequestException('No JSON found in edit request message');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawMessage.slice(jsonStart));
  } catch {
    throw new BadRequestException('Invalid JSON format in edit request');
  }

  const poUpdates = parsed.message;

  if (!poUpdates || typeof poUpdates !== 'object') {
    throw new BadRequestException('Invalid PO update payload');
  }

  await this.sequelize.transaction(async (t) => {
    await this.purchaseOrderService.applyPoUpdate(po, poUpdates, t);

    request.status = 'Approved';
    request.is_edit = true;
    await request.save({ transaction: t });
  });

  await this.notificationService.sendNotification({
    title: 'Edit Request Approved',
    message: `Your edit request for purchase order #${po.po_number} has been approved.`,
    userId: request.user_id.toString(),
    channel: NotificationChannel.IN_APP,
    category: NotificationCategory.SYSTEM,
    payload: {
      poNumber: po.po_number,
      updates: poUpdates
    }
  });

  return request;
}


}


}