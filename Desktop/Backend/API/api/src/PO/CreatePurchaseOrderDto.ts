import { IsNotEmpty, IsNumber, IsDateString, IsArray, IsOptional, IsEnum, ValidateNested, IsString, isString } from 'class-validator';
import { Type , Transform} from 'class-transformer';
import { CreatePurchaseOrderItemDto } from './CreatePurchaseOrderItemDto';
import { Unique } from 'sequelize-typescript';

export class CreatePurchaseOrderDto {
  @IsNumber()
  @IsOptional()
  supplier_id: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsEnum(['Cash', 'Bank Transfer', 'PayPal', 'Credit'])
  @IsOptional()
  payment_method?: 'Cash'| 'Bank Transfer'| 'PayPal'| 'Credit';

  @IsDateString()
  order_date: Date;

  @IsNumber()
  @IsOptional()
  subtotal: number;

  @IsNumber()
  @IsOptional()
  vat: number;

  @IsNumber()
  @IsOptional()
  total_amount: number;

  @IsString()
  @IsOptional()
  @IsEnum(['USD','ILS','JOD'])
  currency: 'USD'|'ILS'|'JOD'
  
  @IsOptional()
  @IsDateString()
  expected_delivery!: Date | null;

  @IsString()
  @IsNotEmpty()
  company_name: string;

  @IsString()
  @IsNotEmpty()
  company_email: string;

  @IsString()
  @IsNotEmpty()
  company_phone: string;

  @IsString()
  @IsNotEmpty()
  company_address: string;

  @IsString()
  @IsNotEmpty()
  supplier_email: string;

  @IsString()
  @IsNotEmpty()
  supplier_phone: string;

  @IsString()
  @IsNotEmpty()
  supplier_address: string;

  @IsOptional()
  @IsEnum(['Open', 'Closed', 'Cancelled', 'Draft', 'Approved', 'Sent','Incident','ReadyForPaid'])
  status?: 'Open'| 'Closed'| 'Cancelled'| 'Draft'| 'Approved'| 'Sent' | 'Incident'|'ReadyForPaid';

  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items: CreatePurchaseOrderItemDto[];


}
