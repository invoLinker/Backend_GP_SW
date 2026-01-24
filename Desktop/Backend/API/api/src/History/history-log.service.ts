import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { HistoryLog } from './history-log.model';
import { CreateHistoryLogDto, HistoryCategory, HistorySeverity } from './create-history-log.dto';
import { Op } from 'sequelize';
import { messaging } from 'firebase-admin';

@Injectable()
export class HistoryLogService {
  constructor(
    @InjectModel(HistoryLog)
    private historyLogModel: typeof HistoryLog
  ) {}

 

  async createLog(logData: Partial<CreateHistoryLogDto>) {
    try {
      const log = await this.historyLogModel.create({
        action: logData.action || 'Unknown action',
        description: logData.description || '',
        user: logData.user || 'Unknown',
        userRole: logData.userRole || 'Unknown',
        category: logData.category || HistoryCategory.SYSTEM,
        severity: logData.severity || HistorySeverity.INFO,
        details: logData.details || {},
      }as any);

      return log;
    } catch (err) {
      throw new InternalServerErrorException(`Failed to create history log: ${err.message}`);
    }
  }
  

  async findAll() {
    return this.historyLogModel.findAll({ order: [['createdAt', 'DESC']] });
  }

  async DeleteLog(id:number) {
    const log = await this.historyLogModel.findByPk(id);
    if(!log){
      throw new NotFoundException('Log History Not Found')
    }
    await log.destroy();
    return {message:"Log History Deleted Successfully"}

  }

  async DeleteAllLog() {
  await this.historyLogModel.destroy({
    where: {},  
    truncate: true 
  });

   return {message:"All Log History Deleted Successfully"}
  }
  
}
