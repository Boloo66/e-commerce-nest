import { Decimal } from '@prisma/client/runtime/library';

export interface ProcessedCartItem {
  productId: string;
  quantity: number;
  price: Decimal;
  discount: Decimal;
  total: Decimal;
  category?: string;
}
