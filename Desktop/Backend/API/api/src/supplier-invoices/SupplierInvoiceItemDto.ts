import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';


export class SupplierInvoiceItemDto {
  @IsString()
  item_name: string;

  @IsString()
  barcode!: string;

 @IsNumber()
@Transform(({ value }) => parseFloat(value))
quantity!: number;

@IsNumber()
@Transform(({ value }) => parseFloat(value))
unit_price!: number;

@IsNumber()
@Transform(({ value }) => parseFloat(value))
total_price!: number;

  @IsString()
  @IsOptional()
  unit?: string;

 

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
