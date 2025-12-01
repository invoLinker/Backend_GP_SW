import { Type } from 'class-transformer';
import { IsString, IsEmail, IsDateString, IsEnum, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
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
  @IsOptional()
  supplier_name: string;

  @IsEmail()
  @IsOptional()
  supplier_email: string;

  @IsString()
  @IsOptional()
  supplier_phone?: string;

  @IsString()
  @IsOptional()
  supplier_address?: string;

  @IsDateString()
  dn_date: string;

  @IsString()
  @IsOptional()
  to_name: string;

  pdfUrl?: Express.Multer.File

  excelUrl?: Express.Multer.File

  imgUrl?: Express.Multer.File

  @IsString()
  @IsOptional()
  to_email: string;

  @IsString()
  @IsOptional()
  to_phone: string;

  @IsString()
  @IsOptional()
  to_address: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryNoteItemDto)
  items: DeliveryNoteItemDto[];
}
