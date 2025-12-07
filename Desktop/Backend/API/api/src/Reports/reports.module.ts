import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportAIService } from './report-ai.service';

@Module({
  imports: [SequelizeModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportAIService],
  exports: [ReportsService, ReportAIService],
})
export class ReportsModule {}

