import { 
  IsInt, IsDateString, IsNotEmpty, IsNumber, IsOptional, 
  IsEnum, Min, IsString, ValidateNested, ValidateIf 
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'Bank Transfer',
  PAYPAL = 'PayPal',
  CREDIT = 'Credit',
}

export enum Currency {
  USD = 'USD',
  ILS = 'ILS',
  JOD = 'JOD',
}

// تفاصيل الدفع حسب الطريقة
export class PaymentDetailsDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  // للبنك
  @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
  @IsNotEmpty({ message: 'Bank name is required for bank transfer' })
  @IsString()
  bank_name?: string;

  @ValidateIf(o => o.method === PaymentMethod.BANK_TRANSFER)
  @IsNotEmpty({ message: 'Account number is required for bank transfer' })
  @IsString()
  account_number?: string;

  // للبطاقة
  @ValidateIf(o => o.method === PaymentMethod.CREDIT)
  @IsNotEmpty({ message: 'Card number is required for credit card' })
  @IsString()
  card_number?: string;

  @ValidateIf(o => o.method === PaymentMethod.CREDIT)
  @IsNotEmpty({ message: 'Card holder name is required for credit card' })
  @IsString()
  card_holder_name?: string;

  @ValidateIf(o => o.method === PaymentMethod.CREDIT)
  // @IsOptional()
  @IsString()
  expiry_date?: string;

  @ValidateIf(o => o.method === PaymentMethod.CREDIT)
  // @IsOptional()
  @IsString()
  cvv?: string;

  // للبايبال
  @ValidateIf(o => o.method === PaymentMethod.PAYPAL)
  @IsNotEmpty({ message: 'PayPal account email is required' })
  @IsString()
  account_email?: string;

  @ValidateIf(o => o.method === PaymentMethod.PAYPAL || o.method === PaymentMethod.BANK_TRANSFER)
  @IsOptional()
  @IsString()
  transaction_id?: string;
}

export class CreatePaymentDto {
  @IsInt()
  @IsOptional()
  invoice_id?: number;

  @IsDateString()
  @IsOptional()
  payment_date?: string; 

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount_paid?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  remaining_amount?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  payment_details?: PaymentDetailsDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  installment_amount?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency_paid?: Currency;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsNumber()
  currency_difference?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
