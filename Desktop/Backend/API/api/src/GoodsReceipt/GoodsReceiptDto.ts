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

  @IsOptional()
  gr_date?: string;

  @IsOptional()
  note?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items!: GoodsReceiptItemDto[];
}
