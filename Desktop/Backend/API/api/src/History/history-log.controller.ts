// src/history-log/history-log.controller.ts
import { Controller, Get, Query, Post, Body } from '@nestjs/common';
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
  async getAllLogs(
    @Query('category') category?: string,
    @Query('severity') severity?: string,
    @Query('search') search?: string
  ) {
    if (search) {
      return this.historyLogService.searchLogs(search);
    } else if (category && severity) {
      return this.historyLogService.findByCategoryAndSeverity(category, severity);
    } else if (category) {
      return this.historyLogService.findByCategory(category);
    } else if (severity) {
      return this.historyLogService.findBySeverity(severity);
    } else {
      return this.historyLogService.findAll();
    }
  }
}
