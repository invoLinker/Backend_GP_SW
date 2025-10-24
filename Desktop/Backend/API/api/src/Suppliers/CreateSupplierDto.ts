import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  supplier_name: string;

  @IsEmail()
  contact_email: string;

  @IsString()
  @IsNotEmpty()
  contact_phone: string;

  @IsString()
  @IsNotEmpty()
  contact_address: string;
}

