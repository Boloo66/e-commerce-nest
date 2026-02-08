import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CouponsRepository } from './coupons.repository';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { DiscountCalculation } from '../../common/interfaces/discount-calculation.interface';
import { Coupon, CouponRule } from '@prisma/client';

interface CartItem {
  productId: string;
  quantity: number;
  price: Decimal | number;
  category?: string;
}

interface ProcessedCartItem {
  productId: string;
  quantity: number;
  price: Decimal;
  discount: Decimal;
  total: Decimal;
  category?: string;
}

@Injectable()
export class CouponsService {
  constructor(private repository: CouponsRepository) {}

  async create(createCouponDto: CreateCouponDto) {
    return this.repository.create(createCouponDto);
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findOne(id: string) {
    const coupon = await this.repository.findOne(id);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async update(id: string, updateCouponDto: UpdateCouponDto) {
    await this.findOne(id);
    return this.repository.update(id, updateCouponDto);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.repository.remove(id);
  }

  async validateCoupon(code: string, cartItems: CartItem[]) {
    const coupon = await this.repository.findByCode(code);

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is not active');
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      throw new BadRequestException('Coupon is not valid at this time');
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit exceeded');
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    );

    if (coupon.minPurchase && subtotal < Number(coupon.minPurchase)) {
      throw new BadRequestException(
        `Minimum purchase amount of ${Number(coupon.minPurchase)} required`,
      );
    }

    return coupon;
  }

  async calculateDiscount(
    code: string,
    cartItems: CartItem[],
  ): Promise<DiscountCalculation> {
    const coupon = await this.validateCoupon(code, cartItems);

    let discount = new Decimal(0);
    const processedItems: ProcessedCartItem[] = cartItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price:
        item.price instanceof Decimal ? item.price : new Decimal(item.price),
      discount: new Decimal(0),
      total: (item.price instanceof Decimal
        ? item.price
        : new Decimal(item.price)
      ).mul(item.quantity),
      category: item.category,
    }));

    const subtotal = processedItems.reduce(
      (sum, item) => sum.add(item.total),
      new Decimal(0),
    );

    switch (coupon.type) {
      case 'FIXED':
        discount = new Decimal(coupon.value);
        break;

      case 'PERCENTAGE':
        discount = subtotal.mul(new Decimal(coupon.value)).div(100);
        if (coupon.maxDiscount) {
          const maxDiscount = new Decimal(coupon.maxDiscount);
          if (discount.greaterThan(maxDiscount)) {
            discount = maxDiscount;
          }
        }
        break;

      case 'BUY_X_GET_Y':
        discount = this.calculateBuyXGetYDiscount(coupon, processedItems);
        break;

      case 'FREE_SHIPPING':
        discount = new Decimal(0);
        break;
    }

    if (coupon.rules && coupon.rules.length > 0) {
      const ruleDiscount = this.applyRuleDiscounts(
        coupon.rules,
        processedItems,
      );
      discount = discount.add(ruleDiscount);
    }

    const total = subtotal.sub(discount);

    return {
      subtotal,
      discount,
      total: total.lessThan(0) ? new Decimal(0) : total,
      appliedCoupon: {
        code: coupon.code,
        discountAmount: discount,
      },
      items: processedItems,
    };
  }

  private calculateBuyXGetYDiscount(
    coupon: Coupon & { rules: CouponRule[] },
    items: ProcessedCartItem[],
  ): Decimal {
    let discount = new Decimal(0);

    for (const rule of coupon.rules || []) {
      if (rule.type === 'BUY_X_GET_Y' && rule.buyQuantity && rule.getQuantity) {
        const applicableItems = items.filter(
          (item) => !rule.productId || item.productId === rule.productId,
        );

        for (const item of applicableItems) {
          const sets = Math.floor(item.quantity / rule.buyQuantity);
          const freeItems = Math.min(sets * rule.getQuantity, item.quantity);
          const itemDiscount = item.price.mul(freeItems);
          discount = discount.add(itemDiscount);
          item.discount = item.discount.add(itemDiscount);
        }
      }
    }

    return discount;
  }

  private applyRuleDiscounts(
    rules: CouponRule[],
    items: ProcessedCartItem[],
  ): Decimal {
    let totalDiscount = new Decimal(0);

    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      switch (rule.type) {
        case 'PRODUCT':
          if (rule.productId) {
            const item = items.find((i) => i.productId === rule.productId);
            if (item) {
              const ruleDiscount = this.calculateRuleDiscount(rule, item);
              totalDiscount = totalDiscount.add(ruleDiscount);
              item.discount = item.discount.add(ruleDiscount);
            }
          }
          break;

        case 'CATEGORY':
          if (rule.categoryId) {
            const categoryItems = items.filter(
              (i) => i.category === rule.categoryId,
            );
            for (const item of categoryItems) {
              const ruleDiscount = this.calculateRuleDiscount(rule, item);
              totalDiscount = totalDiscount.add(ruleDiscount);
              item.discount = item.discount.add(ruleDiscount);
            }
          }
          break;
      }
    }

    return totalDiscount;
  }

  private calculateRuleDiscount(
    rule: CouponRule,
    item: ProcessedCartItem,
  ): Decimal {
    let discount = new Decimal(0);

    if (rule.discountFixed) {
      discount = new Decimal(rule.discountFixed).mul(item.quantity);
    } else if (rule.discountPercentage) {
      discount = item.total.mul(new Decimal(rule.discountPercentage)).div(100);
    }

    return discount;
  }
}
