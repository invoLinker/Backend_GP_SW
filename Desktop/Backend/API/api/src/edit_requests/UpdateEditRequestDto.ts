import { PartialType } from '@nestjs/mapped-types';
import { CreateEditRequestDto } from './edit-requestDto';
import { IsEnum } from 'class-validator';

export class UpdateEditRequestDto extends PartialType(CreateEditRequestDto) {

  @IsEnum(['pending', 'approved', 'rejected'], { message: 'status must be one of the following values: pending or approved orrejected ' })
  status?: 'pending' | 'approved' | 'rejected';
}
