import { IsString, IsInt, IsOptional, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';


export class CreateStockDto {
  @IsString()
  item_name: string;

  @IsString()
  barcode: string;

  @IsInt()
  dn_id?: number; 

  @IsInt()
  quantity: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  Itemlocation?:string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiration_date?: Date | null;

  QR?: Express.Multer.File; 

  @IsEnum(['Available', 'Expired', 'Reserved','OutOfStock'])
  @IsOptional()
  status?: 'Available' | 'Expired' | 'Reserved'|'OutOfStock';
}
