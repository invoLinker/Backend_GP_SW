import { IsNotEmpty, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GoodsReceiptItemDto {
  @IsNotEmpty()
  item_name!: string;

  @IsNotEmpty()
  received_quantity!: number;

  @IsNotEmpty()
  unit!: string;

  @IsNotEmpty()
  barcode!: string;

  @IsOptional()
  notes?: string;

  @IsOptional()
  expiration_date?:Date;
}

