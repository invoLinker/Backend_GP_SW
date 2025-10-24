import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsInt } from 'class-validator';

export class SupplierInvoiceItemDto {
//   @IsInt()
//   invoice_id?: number;

  @IsString()
  item_name: string;

  @IsString()
  barcode!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unit_price!: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  total_price!: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsBoolean()
  @IsOptional()
  is_matched?: boolean;

  @IsString()
  @IsOptional()
  match_notes?: string;

}
