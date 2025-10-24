import { IsOptional, IsString } from 'class-validator';

export class FilterStockDto {
  @IsOptional()
  @IsString()
  product_name?: string;

  @IsOptional()
  @IsString()
  status?: string;

   @IsOptional()
  @IsString()
  barcode?: string;
}
