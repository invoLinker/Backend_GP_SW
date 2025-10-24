import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './CreatUserDto';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsInt, MinLength } from 'class-validator';


export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  old_password?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  new_password: string;
  
  @IsOptional()
  @IsString()
  roleName: string;

}
