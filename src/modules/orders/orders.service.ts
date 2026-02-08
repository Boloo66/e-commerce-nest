import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
import { CartRepository } from '../cart/cart.repository';
import { CouponsService } from '../coupons/coupons.service';
import { ProductsRepository } from '../products/products.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { RedisService } from '../cache/redis.service';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { ProcessedCartItem } from '../../common/interfaces/cart-items.interface';
import { Order } from '@prisma/client';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Injectable()
export class OrdersService {
  private readonly CACHE_TTL = 900; // 15 minutes

  constructor(
    private repository: OrdersRepository,
    private cartRepository: CartRepository,
    private couponsService: CouponsService,
    private productsRepository: ProductsRepository,
    private redis: RedisService,
  ) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto) {
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
    }

    let discount = new Decimal(0);
    let couponId: string | undefined;
    let processedItems: ProcessedCartItem[] = cartItems.map((item) => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
      discount: new Decimal(0),
      total: item.product.price.mul(item.quantity),
      category: item.product.category ?? undefined,
    }));

    if (createOrderDto.couponCode) {
      try {
        const coupon = await this.couponsService.validateCoupon(
          createOrderDto.couponCode,
          processedItems,
        );

        const discountCalc = await this.couponsService.calculateDiscount(
          createOrderDto.couponCode,
          processedItems,
        );
        discount = discountCalc.discount;
        processedItems = discountCalc.items.map((item, index) => ({
          ...processedItems[index],
          discount: item.discount,
          total: item.total,
        }));

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

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const order = await this.repository.create({
      userId,
      orderNumber,
      subtotal,
      discount,
      total,
      couponId,
      items: processedItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        discount: item.discount,
        total: item.total,
      })),
    });

    await Promise.all(
      cartItems.map((item) =>
        this.productsRepository.update(item.product.id, {
          stock: item.product.stock - item.quantity,
        }),
      ),
    );

    if (couponId) {
      await this.couponsService['repository'].incrementUsage(couponId);
    }

    await this.cartRepository.clearCart(userId);

    await this.invalidateOrderCache(userId);
    await this.redis.del(`cart:${userId}`);

    return order;
  }

  async findUserOrders(
    userId: string,
    query: OrderQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { status, limit = 10, cursor } = query;

    const orders = await this.repository.findUserOrders(userId, {
      status,
      take: limit + 1,
      cursor,
    });

    const hasMore = orders.length > limit;
    const data = hasMore ? orders.slice(0, -1) : orders;
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;

    const total = await this.repository.count(userId, status);

    return {
      data,
      meta: {
        total,
        hasMore,
        nextCursor,
      },
    };
  }

  async findOne(id: string, userId: string, isAdmin: boolean = false) {
    const cacheKey = `order:${id}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      const order = JSON.parse(cached) as Order;
      if (!isAdmin && order.userId !== userId) {
        throw new ForbiddenException('Access denied');
      }
      return order;
    }

    const order = await this.repository.findOne(id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.redis.set(cacheKey, JSON.stringify(order), this.CACHE_TTL);
    return order;
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    userId: string,
    isAdmin: boolean = false,
  ) {
    const order = await this.findOne(id, userId, isAdmin);

    if (!isAdmin) {
      throw new ForbiddenException('Only admins can update order status');
    }

    const updated = await this.repository.updateStatus(id, status);
    await this.redis.del(`order:${id}`);
    await this.invalidateOrderCache(order.userId);

    return updated;
  }

  private async invalidateOrderCache(userId: string) {
    await this.redis.delPattern(`orders:${userId}:*`);
  }
}
