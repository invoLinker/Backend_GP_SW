import { PartialType } from '@nestjs/mapped-types';
import { CreateStockDto } from './CreateStockDto';

export class UpdateStockDto extends PartialType(CreateStockDto) {}
