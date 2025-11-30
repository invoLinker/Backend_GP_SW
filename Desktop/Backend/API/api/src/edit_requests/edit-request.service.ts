import { BadRequestException, forwardRef, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EditRequest } from './edit_requests.model';
import { PurchaseOrder } from 'src/PO/po.model';
import { User } from 'src/users/users.model';
import { UpdateEditRequestDto } from './UpdateEditRequestDto';
import { NotificationService } from 'src/Notification/notification.service';
import {NotificationCategory, NotificationChannel} from '../Notification/create-notification.dto'
import { PurchaseOrderService } from 'src/PO/po.service';


@Injectable()
export class EditRequestService {
  constructor(
  @InjectModel(EditRequest)
  private editRequestModel: typeof EditRequest,

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


// async update(id: number, data: UpdateEditRequestDto): Promise<EditRequest> {
//   const request = await this.editRequestModel.findByPk(id);

//   if (!request) throw new NotFoundException(`EditRequest with id ${id} not found`);
 
//   const po = await PurchaseOrder.findByPk(request?.invoice_id);
   
//   if (!po) throw new NotFoundException(`PO for this edit request does not exist.`);


//   if (!request.is_edit) {
//     if (data.message !== undefined) request.message = data.message;
//     if (data.status !== undefined) request.status = data.status;

//     await request.save();

//     if (request.user) {
//       await this.notificationService.sendNotification({
//         title: `Edit Request ${data.status}`,
//         message: `Your edit request for purchase order #${po?.po_number} with request (${request.message}) has been ${data.status}.`,
//         userId: request.user.user_id.toString(),
//         channel: NotificationChannel.IN_APP,
//         category: NotificationCategory.SYSTEM,
//         payload: {},
//       });
//     }

//     return request;
//   }

//   return request;
// }


async update(id: number, data: UpdateEditRequestDto) {
  const request = await this.editRequestModel.findByPk(id, {
    include: [
      { model: PurchaseOrder, as: 'invoice' },
      { model: User, as: 'user' }
    ]
  });

  if (!request) throw new NotFoundException('Request not found');

  const po = request.invoice;

  if (data.status === 'Rejected') {
    request.status = 'Rejected';
    await request.save();
    return request;
  }

  if (data.status === 'Approved') {

    const msg = request.message;
    const jsonStart = msg.indexOf('{');
    const jsonString = msg.slice(jsonStart);

    let updateDto: any;
    try {
      updateDto = JSON.parse(jsonString);
    } catch (e) {
      throw new BadRequestException('Invalid edit request JSON');
    }

    // تطبيق التعديلات
    await this.purchaseOrderService.applyPoUpdate(po, updateDto, null);

    request.status = 'Approved';
    request.is_edit = true;
    await request.save();

    return request;
  }

  return request;
}


}