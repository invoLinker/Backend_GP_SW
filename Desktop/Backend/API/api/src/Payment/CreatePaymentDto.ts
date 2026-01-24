import {
  IsInt, IsDateString, IsNotEmpty, IsNumber, IsOptional,
  IsEnum, Min, IsString, ValidateNested, ValidateIf
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'Bank Transfer',
  STRIPE = 'Stripe',
  CREDIT = 'Credit',
}

export enum Currency {
  USD = 'USD',
  ILS = 'ILS',
  JOD = 'JOD',
}

export class PaymentDetailsDto {
  @IsEnum(PaymentMethod)
  @IsOptional()
  method: PaymentMethod;

  // BANK
  @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
  @IsNotEmpty()
  @IsString()
  bank_name?: string;

  @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
  @IsNotEmpty()
  @IsString()
  account_holder?: string;

  @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
  @IsNotEmpty()
  @IsString()
  account_number?: string;

  @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
  @IsNotEmpty()
  @IsString()
  iban?: string;

  @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
  @IsNotEmpty()
  @IsString()
  swift?: string;

  @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
  @IsOptional()
  @IsString()
  reference_code?: string;


  // CREDIT CARD
  @ValidateIf(o => o.method === PaymentMethod.CREDIT)
  @IsNotEmpty()
  @IsString()
  card_number?: string;

  @ValidateIf(o => o.method === PaymentMethod.CREDIT)
  @IsNotEmpty()
  @IsString()
  card_holder_name?: string;

  @ValidateIf(o => o.method === PaymentMethod.CREDIT)
  @IsString()
  expiry_date?: string;

  @ValidateIf(o => o.method === PaymentMethod.CREDIT)
  @IsString()
  cvv?: string;

  // STRIPE
  @ValidateIf(o => o.method === PaymentMethod.STRIPE)
  @IsOptional()
  stripeResult?: any;

  @ValidateIf(o => o.method === PaymentMethod.STRIPE)
  @IsOptional()
  @IsString()
  client_secret?: string; 

  @ValidateIf(o => o.method === PaymentMethod.STRIPE)
  @IsOptional()
  @IsString()
  payment_intent_id?: string; 


  // Shared
  @ValidateIf(o => o.method === PaymentMethod.STRIPE || o.method === PaymentMethod.BANK_TRANSFER)
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsNumber()
  rateAtPayment:number
}

export class CreatePaymentDto {
  @IsInt()
  @IsOptional()
  invoice_id?: number;

  @IsDateString()
  @IsOptional()
  payment_date?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  payment_details?: PaymentDetailsDto;

  @IsOptional()
  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  @IsEnum(Currency)
  currency_paid?: Currency;

  @IsOptional()
  @IsString()
  notes?: string;
}
