import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsIn } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  item_name!: string;

  @IsString()
  @IsOptional()  
  item_code!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  min_price?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  max_price?: number;

  @IsString()
  @IsIn(['active', 'inactive'])
  @IsOptional()
  status?: 'active' | 'inactive' = 'active';
}
