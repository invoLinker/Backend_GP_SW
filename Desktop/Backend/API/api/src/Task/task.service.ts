import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Task, TaskStatus } from './task.model';
import { CreateTaskDto } from './create-task.dto';
import { User } from 'src/users/users.model';
import { hrtime, title } from 'process';

@Injectable()
export class TaskService {
  constructor(@InjectModel(Task) private taskModel: typeof Task) {}

  async createTask(dto: CreateTaskDto, userId: number) {
  const creator = await User.findByPk(userId);
  if (!creator) throw new NotFoundException("Creator not found");

  const [firstName, ...lastNameParts] = dto.assignedTo.trim().split(' ');
  const lastName = lastNameParts.join(' ');

  const assignee = await User.findOne({
    where: { first_name:firstName,
            last_name :lastName}
  }as any);
  if (!assignee) throw new NotFoundException("Assigned user not found");

  const task = await this.taskModel.create({
    ...dto,
    created_by: userId,
  }as any);

  return task;
}

async getAllTasks() {
  const tasks = await this.taskModel.findAll();
    if (tasks.length === 0) {
      return { message: 'No tasks found' };
    }
    return tasks; 
  }

  async getTasks(status: 'Pending' | 'In_Progress' | 'Completed'): Promise<Task[]> {
  return this.taskModel.findAll({
    where: {status: status},
    order: [['dueDate', 'ASC']], // عرض حسب تاريخ الاستحقاق
  } as any);
}

  async updateStatus(taskId: number): Promise<Task> {
    const task = await this.taskModel.findByPk(taskId);
    if (!task) throw new NotFoundException('Task not found');

    if (task.status === TaskStatus.PENDING) {
      task.status = TaskStatus.IN_PROGRESS;
    } else if (task.status === TaskStatus.IN_PROGRESS) {
      task.status = TaskStatus.COMPLETED;
    }

    await task.save();
    return task;
  }

  async deleteTask(taskId: number): Promise<{ message: string }> {
    const task = await this.taskModel.findByPk(taskId);
    if (!task) throw new NotFoundException('Task not found');

    await task.destroy();
    return { message: 'Task deleted successfully.' };
  }

  async getTasksByUser(
  fullName: string,
  status?: 'Pending' | 'In_Progress' | 'Completed'
): Promise<Task[]> {
  const whereClause: any = { assignedTo: fullName };
  if (status) whereClause.status = status;

  return this.taskModel.findAll({
    where: whereClause,
    order: [['dueDate', 'ASC']],
  });
}

}
