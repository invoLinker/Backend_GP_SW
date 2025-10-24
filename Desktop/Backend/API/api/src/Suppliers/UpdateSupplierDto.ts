import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplierDto } from './CreateSupplierDto';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
