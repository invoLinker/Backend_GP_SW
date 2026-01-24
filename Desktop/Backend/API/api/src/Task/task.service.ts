import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Task, TaskStatus } from './task.model';
import { CreateTaskDto } from './create-task.dto';
import { User } from 'src/users/users.model';
import { hrtime, title } from 'process';
import { NotificationService } from 'src/Notification/notification.service';
import {NotificationCategory, NotificationChannel} from '../Notification/create-notification.dto'
import { Op } from 'sequelize';

@Injectable()
export class TaskService {
  constructor(@InjectModel(Task) private taskModel: typeof Task,
  private readonly notificationService: NotificationService
) {}

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

  await this.notificationService.sendNotification({
    title: 'New Task Assigned',
    message: `You have been assigned a new task: "${dto.title}"`,
    userId: assignee.user_id.toString(),
    channel: NotificationChannel.IN_APP,
    category: NotificationCategory.TASK,
    payload: { taskId: task.id, dueDate: task.dueDate },
  });


 return {message: 'Task Created Successfully'}
}

async getAllTasks() {
  const tasks = await this.taskModel.findAll();
    if (tasks.length === 0) {
      return { message: 'No tasks found' };
    }
    return tasks; 
  }

  async getTasks(status: 'Pending' | 'In Progress' | 'Completed'): Promise<Task[]> {
  return this.taskModel.findAll({
    where: {status: status},
    order: [['dueDate', 'ASC']],
  } as any);
}

  async updateStatus(taskId: number) {
    const task = await this.taskModel.findByPk(taskId);
    if (!task) throw new NotFoundException('Task not found');

    if (task.status === TaskStatus.PENDING) {
      task.status = TaskStatus.IN_PROGRESS;
    } else if (task.status === TaskStatus.IN_PROGRESS) {
      task.status = TaskStatus.COMPLETED;
    }

    await task.save();

    await this.notificationService.sendNotification({
    title: 'Task Status Updated',
    message: `Updated the status of task "${task.title}" to "${task.status}".`,
    userId: task.created_by.toString(),
    channel: NotificationChannel.IN_APP,
    category: NotificationCategory.TASK,
    payload: { taskId: task.id, newStatus: task.status },
  });
  
    return {message: 'Task Updated successfully'};
  }

  async deleteTask(taskId: number): Promise<{ message: string }> {
    const task = await this.taskModel.findByPk(taskId);
    if (!task) throw new NotFoundException('Task not found');

    await task.destroy();
    return { message: 'Task deleted successfully.' };
  }


async getTasksAssignedToUser(userId: number): Promise<Task[]> {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundException('User not found');

  const fullName = `${user.first_name} ${user.last_name}`.trim();

  return this.taskModel.findAll({
    where: {
  assignedTo: {
    [Op.like]: `%${fullName}%`,
  },
},
    order: [['dueDate', 'ASC']],
  });
}


}
