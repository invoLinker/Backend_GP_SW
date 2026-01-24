import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Shift } from './shift.model';
import { col, fn, Op, where } from 'sequelize';
import { User } from 'src/users/users.model';

@Injectable()
export class ShiftService {

  async startShift(userId: number) {
    const activeShift = await Shift.findOne({
      where: {
        user_id: userId,
        status: 'ONGOING',
      },
    });

    if (activeShift) {
      throw new BadRequestException('You already have an ongoing shift');
    }

    const shift = await Shift.create({
      user_id: userId,
      start_time: new Date(),
      status: 'ONGOING',
    } as any);

    return {
      message: 'Shift started',
      shift,
    };
  }

    async endShift(userId: number) {
    const shift = await Shift.findOne({
        where: {
        user_id: userId,
        status: 'ONGOING',
        },
    });

    if (!shift) {
        throw new NotFoundException('No ongoing shift found');
    }

    const endTime = new Date();
    const diffMs = endTime.getTime() - shift.start_time.getTime();
    const totalSeconds = Math.floor(diffMs / 1000);
    const durationMinutes = Math.floor(totalSeconds / 60);

    shift.end_time = endTime;
    shift.duration_minutes = durationMinutes;
    shift.status = 'COMPLETED';

    await shift.save();

    const duration = this.formatDuration(totalSeconds);

    return {
        message: 'Shift ended',
        shift: {
        id: shift.id,
        start_time: shift.start_time,
        end_time: shift.end_time,
        status: shift.status,
        duration_minutes: durationMinutes,
        duration, 
        },
    };
    }

    private formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
        hours,
        minutes,
        seconds,
        formatted: `${hours}h ${minutes}m ${seconds}s`,
    };
    }


  async getUserShifts(userId: number) {
    return Shift.findAll({
      where: { user_id: userId },
      order: [['start_time', 'DESC']],
    });
  }

  async deleteShift(userId: number, shiftId: number) {
  const shift = await Shift.findOne({
    where: {
      id: shiftId,
      user_id: userId,
    },
  });

  if (!shift) {
    throw new NotFoundException('Shift not found');
  }

  if (shift.status === 'ONGOING') {
    throw new BadRequestException('Cannot delete an ongoing shift');
  }

  await shift.destroy();

  return {
    message: 'Shift deleted successfully',
  };
}


    async getEmployeesShifts(date?: string) {
    const shiftWhere: any = {};

    if (date) {
    shiftWhere[Op.and] = [
        where(fn('DATE', col('start_time')), date),
    ];
    }

    const users = await User.findAll({
        attributes: ['user_id', 'first_name', 'last_name', 'email'],
        include: [
        {
            model: Shift,
            as: 'shifts', 
            where: shiftWhere,
            required: false,
            separate: true,
            order: [['start_time', 'DESC']],
        },
        ],
    });

    return users.map(user => {
        const shifts = (user as any).shifts || [];

        const completed = shifts.filter(s => s.status === 'COMPLETED');
        const ongoing = shifts.find(s => s.status === 'ONGOING');

        const totalMinutes = completed.reduce(
        (sum, s) => sum + (s.duration_minutes || 0),
        0
        );

        return {
        employee: {
            id: user.user_id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
        },
        totalShifts: completed.length,
        totalMinutes,
        averageMinutes:
            completed.length > 0
            ? Math.round(totalMinutes / completed.length)
            : 0,
        ongoingShift: ongoing || null,
        shifts,
        };
    });
    }

}