import { Controller, Post, Patch, Get, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { ShiftService } from './shift.service';

@Controller('shifts')
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Get('employees')
  getEmployees(@Query('date') date?: string) {
    return this.shiftService.getEmployeesShifts(date);
  }

  @Post('start/:userId')
  startShift(@Param('userId') userId: number) {
    return this.shiftService.startShift(Number(userId));
  }

  @Patch('end/:userId')
  endShift(@Param('userId') userId: number) {
    return this.shiftService.endShift(Number(userId));
  }

  @Get(':userId')
  getUserShifts(@Param('userId') userId: number) {
    return this.shiftService.getUserShifts(Number(userId));
  }

  @Delete(':shiftId/user/:userId')
  deleteShift(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('shiftId', ParseIntPipe) shiftId: number,
  ) {
    return this.shiftService.deleteShift(userId, shiftId);
  }
}
