import { IsString, IsInt, IsOptional, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';


export class CreateStockDto {
  @IsString()
  item_name: string;

  @IsString()
  barcode: string;

  @IsInt()
  dn_id?: number; // رقم delivery note اختياري

  @IsInt()
  quantity: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiration_date?: Date;

  @IsEnum(['Available', 'Expired', 'Reserved','OutOfStock'])
  @IsOptional()
  status?: 'Available' | 'Expired' | 'Reserved'|'OutOfStock';
}
