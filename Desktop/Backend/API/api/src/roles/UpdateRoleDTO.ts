import { IsString, IsOptional } from 'class-validator';

export class UpdatDto {
  @IsString()
  @IsOptional()
  role_name?: string;

  @IsString()
  @IsOptional()
  description?:string;
}
