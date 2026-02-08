import { Injectable, BadRequestException } from '@nestjs/common';
import { CartRepository } from '../cart/cart.repository';
import { CouponsService } from '../coupons/coupons.service';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CheckoutService {
  constructor(
    private cartRepository: CartRepository,
    private couponsService: CouponsService,
    private prisma: PrismaService,
  ) {}

  async checkout(
    userId: string,
    checkoutDto: CheckoutDto,
  ): Promise<PaymentResponseDto> {
    const cartItems = await this.cartRepository.findUserCart(userId);

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cartItems) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.name}`,
        );
      }
      if (!item.product.isActive) {
        throw new BadRequestException(
          `Product ${item.product.name} is no longer available`,
        );
      }
    }

    let discount = new Decimal(0);
    let couponId: string | undefined;

    // All line items to be processed for discount calculation are in this processed format
    let processedItems = cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
      discount: new Decimal(0),
      total: item.product.price.mul(item.quantity),
      category: item.product?.category ?? undefined,
    }));

    if (checkoutDto.couponCode) {
      try {
        const discountCalc = await this.couponsService.calculateDiscount(
          checkoutDto.couponCode,
          processedItems,
        );
        discount = discountCalc.discount;
        processedItems = discountCalc.items.map((item, index) => ({
          ...processedItems[index],
          discount: item.discount,
          total: item.total,
        }));

        const coupon = await this.couponsService.validateCoupon(
          checkoutDto.couponCode,
          processedItems,
        );
        couponId = coupon.id;
      } catch (error) {
        throw new BadRequestException(
          `Coupon error: ${(error as Error).message}`,
        );
      }
    }

    const subtotal = cartItems.reduce(
      (sum, item) => sum.add(item.product.price.mul(item.quantity)),
      new Decimal(0),
    );

    const total = subtotal.sub(discount);

    if (total.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    const paymentResult = await this.processPayment(
      Number(total),
      checkoutDto.paymentMethod || 'card',
    );

    if (!paymentResult.success) {
      return {
        success: false,
        transactionId: paymentResult.transactionId,
        orderId: '',
        amount: Number(total),
        message: 'Payment failed. Please try again.',
      };
    }

    try {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const order = await this.prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            userId,
            orderNumber,
            subtotal,
            discount,
            total,
            status: 'PROCESSING',
            paymentStatus: 'PAID',
            couponId,
            items: {
              create: processedItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                total: item.total,
              })),
            },
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
            coupon: true,
          },
        });

        await Promise.all(
          cartItems.map((item) =>
            tx.product.update({
              where: { id: item.product.id },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            }),
          ),
        );

        if (couponId) {
          await tx.coupon.update({
            where: { id: couponId },
            data: {
              usageCount: {
                increment: 1,
              },
            },
          });
        }

        await tx.cartItem.deleteMany({
          where: { userId },
        });

        return newOrder;
      });

      return {
        success: true,
        transactionId: paymentResult.transactionId,
        orderId: order.id,
        amount: Number(total),
        message: 'Payment successful. Order created.',
      };
    } catch (error) {
      console.error('Order creation failed after payment:', error);

      return {
        success: false,
        transactionId: paymentResult.transactionId,
        orderId: '',
        amount: Number(total),
        message:
          'Payment processed but order creation failed. Please contact support with transaction ID.',
      };
    }
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  private async processPayment(
    amount: number,
    paymentMethod: string,
  ): Promise<{ success: boolean; transactionId: string }> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    return {
      success,
      transactionId,
    };
  }
}
