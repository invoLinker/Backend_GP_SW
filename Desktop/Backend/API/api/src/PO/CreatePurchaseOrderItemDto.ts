import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty()
  item_name: string;

  @IsOptional()
  @IsNumber()
  po_item_id?: number;  

  @IsString()
  @IsOptional()
  barcode: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unit_price: number;

  @IsOptional()
  @IsString()
  unit?: string;
}
