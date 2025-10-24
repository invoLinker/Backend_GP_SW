// src/supplier-invoices/dto/create-supplier-invoice.dto.ts
import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, IsNotEmpty,IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { SupplierInvoiceItemDto } from './SupplierInvoiceItemDto';

export enum PaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'Bank Transfer',
  CHEQUE = 'Cheque',
  CREDIT = 'Credit',
}

export enum InvoiceStatus {
  PENDING = 'Pending',
  VERIFIED = 'Verified',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  PAID = 'Paid',
  CANCELLED = 'Cancelled',
  PENDING_VERIFICATION = 'Pending Verification',
  ON_HOLD = 'On Hold',
  RECEIVED = 'Received',
  INCIDENT = 'Incident',
  PARTIAL_PAID='Partial_paid',
  READYFORPAID= 'ReadyForPaid'
}

export class CreateSupplierInvoiceDto {
  @IsNumber()
  @IsOptional()
  supplier_id?: number;

  @IsString()
  @IsNotEmpty()
  supplier_name: string;

  @IsString()
  @IsNotEmpty()
  supplier_email: string;

  @IsString()
  @IsOptional()
  @IsEnum(['USD','ILS','JOD'])
  currency: 'USD'|'ILS'|'JOD'

  @IsString()
  @IsOptional()
  supplier_phone?: string;

  @IsString()
  @IsOptional()
  supplier_address?: string;


  @IsString()
  @IsOptional()
  po_number?: string;

  @IsString()
  @IsNotEmpty()
  invoice_number: string;

  @IsDateString()
  invoice_date: string;

  @IsDateString()
  received_date: string;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  vat: number;

  @IsNumber()
  @IsOptional()
  discount?: number;

  @IsNumber()
  total_amount: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  payment_method?: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  created_by?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierInvoiceItemDto)
  items: SupplierInvoiceItemDto[];

}
