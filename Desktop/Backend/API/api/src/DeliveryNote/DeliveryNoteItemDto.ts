import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsOptional, isNotEmpty, } from 'class-validator';

export class DeliveryNoteItemDto {
  @IsString()
  @IsNotEmpty()
  item_name: string;

  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @IsString()
  @IsOptional()
  unit: string;

  @IsString()
  @IsNotEmpty()
  barcode: string;
}