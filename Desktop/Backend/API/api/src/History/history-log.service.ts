// src/history-log/history-log.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { HistoryLog } from './history-log.model';
import { CreateHistoryLogDto, HistoryCategory, HistorySeverity } from './create-history-log.dto';
import { Op } from 'sequelize';

@Injectable()
export class HistoryLogService {
  constructor(
    @InjectModel(HistoryLog)
    private historyLogModel: typeof HistoryLog
  ) {}

  /**
   * إنشاء سجل تاريخي (History Log)
   * @param logData بيانات السجل
   */

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

  async findByCategory(category: string) {
    return this.historyLogModel.findAll({ where: { category }, order: [['createdAt', 'DESC']] });
  }

  async findBySeverity(severity: string) {
    return this.historyLogModel.findAll({ where: { severity }, order: [['createdAt', 'DESC']] });
  }

  async findByCategoryAndSeverity(category: string, severity: string) {
    return this.historyLogModel.findAll({ where: { category, severity }, order: [['createdAt', 'DESC']] });
  }

  async searchLogs(keyword: string) {
    return this.historyLogModel.findAll({
      where: {
        [Op.or]: [
          { action: { [Op.like]: `%${keyword}%` } },
          { description: { [Op.like]: `%${keyword}%` } },
          { user: { [Op.like]: `%${keyword}%` } },
          { userRole: { [Op.like]: `%${keyword}%` } },
          { category: { [Op.like]: `%${keyword}%` } }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  }
}
