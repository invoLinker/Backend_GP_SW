import { Controller, Post, Body, Get, Param, Delete, Patch, Query, UseGuards,Request } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './create-task.dto';
import { Task, TaskStatus } from './task.model';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService,
              private readonly historyLogService: HistoryLogService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateTaskDto, @Request() req) {
    try {
      const userId = req.user.userId;
      const result = await this.taskService.createTask(dto, userId);

      await this.historyLogService.createLog({
        action: 'Task Created',
        description: `Task created`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Task Creation Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(@Param('id') id: string, @Request() req){
    try {
      const result = await this.taskService.updateStatus(+id);

      await this.historyLogService.createLog({
        action: 'Task Status Updated',
        description: `Task id=${id} status updated`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Task Status Update Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req) {
    try {
      const result = await this.taskService.deleteTask(+id);

      await this.historyLogService.createLog({
        action: 'Task Deleted',
        description: `Task id=${id} deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Task Deletion Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllTasks() {
    return this.taskService.getAllTasks();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getTasks(@Body('status') status: 'Pending' | 'In Progress' | 'Completed'): Promise<Task[]> {
    return this.taskService.getTasks(status);
  }

  @Get('by-user')
  @UseGuards(JwtAuthGuard)
  async getTasksByUser(
    @Body('name') fullName: string,
    @Body('status') status?: 'Pending' | 'In Progress' | 'Completed'
  ): Promise<Task[]> {
    return this.taskService.getTasksByUser(fullName, status);
  }

}
