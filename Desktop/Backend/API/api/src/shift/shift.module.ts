import { Module } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { Shift } from './shift.model';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [ SequelizeModule.forFeature([Shift])],
  controllers: [ShiftController],
  providers: [ShiftService],
  exports: [ShiftService], 
})
export class ShiftModule {}
