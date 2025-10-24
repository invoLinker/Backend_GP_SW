import { IsNotEmpty, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GoodsReceiptItemDto } from './GoodsReceiptItemDto';

export class CreateGoodsReceiptDto {
  @IsNotEmpty()
  dn_number!: string;

  @IsOptional()
  notes?: string;

  @IsOptional()
  po_number?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items!: GoodsReceiptItemDto[];
}
