import { IsString, IsOptional, Length } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @Length(3, 50)
  permission_name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
