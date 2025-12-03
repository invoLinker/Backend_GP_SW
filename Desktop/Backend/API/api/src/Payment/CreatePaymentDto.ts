// import {
//   IsInt, IsDateString, IsNotEmpty, IsNumber, IsOptional,
//   IsEnum, Min, IsString, ValidateNested, ValidateIf
// } from 'class-validator';
// import { Type } from 'class-transformer';

// export enum PaymentMethod {
//   CASH = 'Cash',
//   BANK_TRANSFER = 'Bank Transfer',
//   STRIPE = 'Stripe',
//   CREDIT = 'Credit',
// }

// export enum Currency {
//   USD = 'USD',
//   ILS = 'ILS',
//   JOD = 'JOD',
// }

// // تفاصيل الدفع حسب الطريقة
// export class PaymentDetailsDto {
//   @IsEnum(PaymentMethod)
//   method: PaymentMethod;

//   // للبنك
//   @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
//   @IsNotEmpty({ message: 'Bank name is required for bank transfer' })
//   @IsString()
//   bank_name?: string;

//   @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
//   @IsNotEmpty({ message: 'Account number is required for bank transfer' })
//   @IsString()
//   account_number?: string;

//   @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
//   @IsNotEmpty()
//   @IsString()
//   account_holder?: string;

//   @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
//   @IsNotEmpty()
//   @IsString()
//   iban?: string;

//   @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
//   @IsNotEmpty()
//   @IsString()
//   swift?: string;

//   // للبطاقة (كريدت)
//   @ValidateIf(o => o.method === PaymentMethod.CREDIT)
//   @IsNotEmpty({ message: 'Card number is required for credit card' })
//   @IsString()
//   card_number?: string;

//   @ValidateIf(o => o.method === PaymentMethod.CREDIT)
//   @IsNotEmpty({ message: 'Card holder name is required for credit card' })
//   @IsString()
//   card_holder_name?: string;

//   @ValidateIf(o => o.method === PaymentMethod.CREDIT)
//   @IsString()
//   expiry_date?: string;

//   @ValidateIf(o => o.method === PaymentMethod.CREDIT)
//   @IsString()
//   cvv?: string;

//   // STRIPE
//   @ValidateIf(o => o.method === PaymentMethod.STRIPE)
//   @IsOptional()
//   @IsString()
//   account_email?: string; // لو حابة تخزني إيميل الحساب

//   @ValidateIf(o => o.method === PaymentMethod.STRIPE)
//   @IsOptional()
//   @IsString()
//   payment_intent_id?: string; // رقم عملية Stripe

//   @ValidateIf(o => o.method === PaymentMethod.STRIPE || o.method === PaymentMethod.BANK_TRANSFER)
//   @IsOptional()
//   @IsString()
//   transaction_id?: string;
// }

// export class CreatePaymentDto {
//   @IsInt()
//   @IsOptional()
//   invoice_id?: number;

//   @IsDateString()
//   @IsOptional()
//   payment_date?: string;

//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   amount_paid?: number;

//   @IsNumber()
//   @Min(0)
//   @IsOptional()
//   remaining_amount?: number;

//   @IsOptional()
//   @ValidateNested()
//   @Type(() => PaymentDetailsDto)
//   payment_details?: PaymentDetailsDto;

//   @IsOptional()
//   @IsNumber()
//   @Min(0)
//   installment_amount?: number;

//   @IsOptional()
//   @IsEnum(Currency)
//   currency_paid?: Currency;

//   @IsOptional()
//   @IsEnum(Currency)
//   currency?: Currency;

//   @IsOptional()
//   @IsNumber()
//   currency_difference?: number;

//   @IsOptional()
//   @IsString()
//   notes?: string;
// }


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
  client_secret?: string;  // <-- نضيف حقل

  @ValidateIf(o => o.method === PaymentMethod.STRIPE)
  @IsOptional()
  @IsString()
  payment_intent_id?: string;  // <-- نضيف حقل


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
