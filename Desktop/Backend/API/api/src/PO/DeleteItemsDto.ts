import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';

export class DeleteItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  itemIds: number[];
}
