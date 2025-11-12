import { Controller, Post, Body, Get, Param, Delete, Patch, Query, UseGuards,Request } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './create-task.dto';
import { Task, TaskStatus } from './task.model';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateTaskDto, @Request() req){
    const userId = req.user.userId;
    return this.taskService.createTask(dto, userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllTasks() {
    return this.taskService.getAllTasks();
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getTasks(@Body('status') status: 'Pending' | 'In_Progress' | 'Completed'): Promise<Task[]> {
    return this.taskService.getTasks(status);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(@Param('id') id: string): Promise<Task> {
    return this.taskService.updateStatus(+id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string) {
    return this.taskService.deleteTask(+id);
  }

  @Get('by-user')
@UseGuards(JwtAuthGuard)
async getTasksByUser(
  @Body('name') fullName: string,
  @Body('status') status?: 'Pending' | 'In_Progress' | 'Completed'
): Promise<Task[]> {
  return this.taskService.getTasksByUser(fullName, status);
}

}
