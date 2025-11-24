import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HistoryLog } from './history-log.model';
import { HistoryLogService } from './history-log.service';
import { HistoryLogController } from './history-log.controller';

@Module({
  imports: [SequelizeModule.forFeature([HistoryLog])],
  controllers: [HistoryLogController],
  providers: [HistoryLogService],
  exports: [HistoryLogService],
})
export class HistoryLogModule {}
