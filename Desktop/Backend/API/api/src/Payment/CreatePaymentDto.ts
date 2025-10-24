import { IsInt, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  invoice_id: number;

  @IsDateString()
  payment_date: string; 

  @IsNumber()
  @Min(0)
  amount_paid: number;

  @IsNumber()
  @Min(0)
  remaining_amount: number;

  @IsEnum(['Cash', 'Bank Transfer', 'Cheque', 'Credit'])
  payment_method: 'Cash' | 'Bank Transfer' | 'Cheque' | 'Credit';

  @IsOptional()
  @IsEnum(['Cash', 'Bank Transfer', 'Cheque', 'Credit'])
  currency?: 'Cash'| 'Bank Transfer'| 'Cheque'| 'Credit';

  @IsOptional()
  @IsNotEmpty()
  notes?: string;
}
