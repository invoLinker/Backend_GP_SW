import { 
  IsString, 
  IsOptional, 
} from 'class-validator';

export class CreatSupplierDTO {
@IsOptional()
  @IsString()
  account_holder?: string;

  @IsOptional()
  @IsString()
  account_number?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  swift?: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

}