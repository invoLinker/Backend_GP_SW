import { IsInt, IsNotEmpty, IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';

export class CreateEditRequestDto {
  @IsInt()
  invoice_id: number;

  @IsInt()
  user_id: number;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsBoolean()
  is_edit?: boolean; 

  @IsOptional()
  @IsEnum(['Pending', 'Approved', 'Rejected'])
  status?: 'Pending' | 'Approved' | 'Rejected'; 
}


