import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { EditRequest } from './edit_requests.model';
import { PurchaseOrder } from 'src/PO/po.model';
import { User } from 'src/users/users.model';
import { UpdateEditRequestDto } from './UpdateEditRequestDto';

@Injectable()
export class EditRequestService {
  constructor(
    @InjectModel(EditRequest)
    private editRequestModel: typeof EditRequest,
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

async findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<EditRequest[]> {
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


async update(id: number, data: UpdateEditRequestDto): Promise<EditRequest> {
  const request = await this.editRequestModel.findByPk(id);

  if (!request) throw new NotFoundException(`EditRequest with id ${id} not found`);

  if (!request.is_edit) {
    if (data.message !== undefined) request.message = data.message;
    if (data.status !== undefined) request.status = data.status;

    await request.save();
    return request;
  }

  return request;
}


}
