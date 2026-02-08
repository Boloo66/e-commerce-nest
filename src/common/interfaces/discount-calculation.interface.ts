import { Decimal } from '@prisma/client/runtime/library';

export interface DiscountCalculation {
  subtotal: Decimal;
  discount: Decimal;
  total: Decimal;
  appliedCoupon?: {
    code: string;
    discountAmount: Decimal;
  };
  items: Array<{
    productId: string;
    quantity: number;
    price: Decimal;
    discount: Decimal;
    total: Decimal;
  }>;
}
