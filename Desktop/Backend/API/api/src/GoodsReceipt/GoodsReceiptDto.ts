import { IsNotEmpty, IsDateString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { GoodsReceiptItemDto } from './GoodsReceiptItemDto';

export class CreateGoodsReceiptDto {
  @IsOptional()
  dn_number?: string;

  @IsOptional()
  notes?: string;

  @IsOptional()
  po_number?: string;

  @IsOptional()
  gr_date?: string;

  @IsOptional()
  note?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items?: GoodsReceiptItemDto[];
}
