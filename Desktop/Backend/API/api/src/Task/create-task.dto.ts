import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { TaskPriority, TaskStatus } from './task.model';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  assignedTo: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
