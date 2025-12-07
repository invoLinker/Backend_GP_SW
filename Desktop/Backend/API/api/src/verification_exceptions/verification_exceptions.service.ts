import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { verification_exceptions } from './verification_exceptions.model';

@Injectable()
export class AuditExceptionService {
  constructor(
    @InjectModel(verification_exceptions)
    private exceptionModel: typeof verification_exceptions,
  ) {}

  async create(po_number: string, description: string, user_id: number) {
    return await this.exceptionModel.create({
      po_number,
      description,
      user_id,
    });
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

    return {
    message: status === 'Approved'
        ? 'verification_exceptions Approved'
        : 'verification_exceptions Rejected'
    };
  }
}
