import { ArrayNotEmpty, IsArray, IsInt, IsString } from 'class-validator';

class ReorderItem {
  @IsString()
  id: string;

  @IsInt()
  sortOrder: number;
}

export class ReorderItemsDto {
  @IsArray()
  @ArrayNotEmpty()
  items: ReorderItem[];
}
