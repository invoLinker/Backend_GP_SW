import { Controller, Get, Query, Post, Body, Delete, Param } from '@nestjs/common';
import { HistoryLogService } from './history-log.service';
import { CreateHistoryLogDto } from './create-history-log.dto';

@Controller('history-logs')
export class HistoryLogController {
  constructor(private readonly historyLogService: HistoryLogService) {}

  @Post()
  async create(@Body() dto: CreateHistoryLogDto) {
    return this.historyLogService.createLog(dto);
  }

  @Get()
  async getAllLogs() {
      return this.historyLogService.findAll();
  }

  @Delete(':id')
  async DeleteLogs(@Param('id') id: number) {
      return this.historyLogService.DeleteLog(id);
  }
  
  @Delete()
  async deleteAllLogs() {
      return this.historyLogService.DeleteAllLog();
  }
}
