export class StockCheckItemDto {
  item_name: string;
  barcode: string;
  expiration_date?: string | null;
  physical_quantity: number;
}

