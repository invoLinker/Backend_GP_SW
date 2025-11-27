import { IsString, IsNotEmpty } from 'class-validator';

export class RoleDto {
  @IsString()
  @IsNotEmpty()
  role_name: string;

  @IsString()
  @IsNotEmpty()
  description:string;
}
