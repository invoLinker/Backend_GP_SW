import { IsString, IsNotEmpty, IsNumber, IsOptional, isNotEmpty, } from 'class-validator';

export class DeliveryNoteItemDto {
  @IsString()
  @IsNotEmpty()
  product_name: string;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  unit: string;

  @IsString()
  @IsNotEmpty()
  barcode: string;
}