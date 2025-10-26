import { IsInt, IsOptional, IsNotEmpty } from 'class-validator';

export class CompletePaymentDto {
  @IsInt()
  payment_id: number;

  @IsOptional()
  @IsNotEmpty()
  payment_details?: string; // JSON أو نص يوضح رقم الحساب / الشيك / البطاقة
}
