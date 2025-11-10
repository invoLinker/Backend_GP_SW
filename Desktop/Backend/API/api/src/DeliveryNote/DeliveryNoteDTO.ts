import { Type } from 'class-transformer';
import { IsString, IsEmail, IsDateString, IsEnum, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { DeliveryNoteItemDto } from './DeliveryNoteItemDto';

export enum DeliveryNoteStatus {
  PENDING = 'Pending',
  VERIFIED = 'Verified',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  RECEIVED = 'Received',
  INCIDENT = 'Incident',
}

export class CreateDeliveryNoteDto {
  @IsString()
  @IsNotEmpty()
  po_number: string;

  @IsString()
  dn_number?:string;

  @IsString()
  @IsNotEmpty()
  supplier_name: string;

  @IsEmail()
  supplier_email: string;

  @IsString()
  supplier_phone?: string;

  @IsString()
  supplier_address?: string;

  @IsDateString()
  dn_date: string;

  @IsString()
  @IsNotEmpty()
  to_name: string;

  @IsString()
  @IsNotEmpty()
  to_email: string;

  @IsString()
  @IsNotEmpty()
  to_phone: string;

  @IsString()
  @IsNotEmpty()
  to_address: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryNoteItemDto)
  items: DeliveryNoteItemDto[];
}
