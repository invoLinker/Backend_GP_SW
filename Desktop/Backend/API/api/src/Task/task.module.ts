import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Task } from './task.model';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { HistoryLog } from 'src/History/history-log.model';
import { HistoryLogService } from 'src/History/history-log.service';

@Module({
  imports: [SequelizeModule.forFeature([Task, HistoryLog])],
  providers: [TaskService, HistoryLogService],
  controllers: [TaskController],
})
export class TaskModule {}
