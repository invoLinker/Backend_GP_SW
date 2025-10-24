import { PartialType } from '@nestjs/mapped-types';
import { CreateItemDto } from './CreatItemDto';

export class UpdateItemDto extends PartialType(CreateItemDto) {}
