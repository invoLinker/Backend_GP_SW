import { 
  IsString, 
  IsNotEmpty, 
  IsEmail, 
  IsOptional, 
  IsEnum, 
  IsInt, 
  IsDateString, 
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';


export enum UserStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export enum Gender {
  Male = 'Male',
  Female = 'Female',
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsOptional()
  last_name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  password_hash?: string | null;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsString()
  @IsOptional()
  location?: string;

  // @IsString()
  // @IsOptional()
  profile_image?: Express.Multer.File | null; 

  // @IsString()
  // @IsNotEmpty()
  @IsOptional()
  ID_image?:  Express.Multer.File; 

  @IsEnum(Gender, { message: 'gender must be either Male or Female' })
  @IsOptional()
  gender?: Gender;

  @IsDateString()
  @IsOptional()
  birth_date?: Date;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  role_id?: number;
 
  @IsEnum(['Admin','Accountant','Warehouse','Supplier','Payment Officer', 'Viewer'])
  @IsOptional()
  role_name?:'Admin'|'Accountant'|'Warehouse'|'Supplier'|'Payment Officer'| 'Viewer';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  sendWelcomeEmail?: boolean;

  @IsEnum(UserStatus, { message: 'status must be either Active or Inactive' })
  @IsOptional()
  status?: UserStatus;

  @IsOptional()
  @IsString()
  google_id?: string;

  @IsOptional()
  @IsEnum(['local', 'google'])
  provider?: 'local' | 'google';
}
