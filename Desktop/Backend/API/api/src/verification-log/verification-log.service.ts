import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PurchaseOrder } from '../PO/po.model';
import { DeliveryNote } from '../DeliveryNote/delivery-note.model';
import { GoodsReceipts } from '../GoodsReceipt/GoodsReceipt.model';
import { User } from '../users/users.model';
import { VerificationLog } from './verification-log.model';

@Injectable()
export class AIVerificationService {
  constructor(
    @InjectModel(VerificationLog)
    private logModel: typeof VerificationLog,
  ) {}

  async createLog(
    poNumber: string,
    userId: number,
    stage: 'PO-SI' | 'PO-DN' | 'PO-GR',
    aiMessage: string,
  ) {
    const log = await this.logModel.create({
      poNumber,
      userId,
      stage,
      aiMessage,
    });

    return {
      log
    };
  }


  async getLogsByPONumber(poNumber: string) {

  const cleanPONumber = poNumber.trim().toUpperCase();

const logs = await this.logModel.findAll({
  where: {
    poNumber: cleanPONumber,
  },
  order: [['createdAt', 'ASC']],
});


  if (!logs || logs.length === 0) {
    throw new NotFoundException(`No verification logs found for PO ${poNumber}`);
  }

  return logs.map(log => {
    let parsedAIMessage: any = null;
    try {
      parsedAIMessage = JSON.parse(log.aiMessage); 
    } catch (err) {
      parsedAIMessage = log.aiMessage; 
    }

    return {
      id: log.id,
      poNumber: log.poNumber,
      userId: log.userId,
      stage: log.stage,
      aiMessage: parsedAIMessage,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    };
  });
}

}
