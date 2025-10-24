import { IsString, IsOptional, Length, IsNotEmpty } from 'class-validator';

export class RolePermissionDto {
  @IsString()
  @IsNotEmpty()
  roleName: string;

  @IsString()
  @IsNotEmpty()
  permissionName: string;
}
