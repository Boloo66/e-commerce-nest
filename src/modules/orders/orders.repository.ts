import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import { OrderStatus } from '../../common/enums/order-status.enum';

@Injectable()
export class OrdersRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId: string;
    orderNumber: string;
    subtotal: Prisma.Decimal;
    discount: Prisma.Decimal;
    total: Prisma.Decimal;
    couponId?: string;
    items: Array<{
      productId: string;
      quantity: number;
      price: Prisma.Decimal;
      discount: Prisma.Decimal;
      total: Prisma.Decimal;
    }>;
  }) {
    return this.prisma.order.create({
      data: {
        userId: data.userId,
        orderNumber: data.orderNumber,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        couponId: data.couponId,
        items: {
          create: data.items,
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
  }

  async findUserOrders(
    userId: string,
    options?: {
      status?: OrderStatus;
      take?: number;
      cursor?: string;
    },
  ) {
    const where: Prisma.OrderWhereInput = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    return this.prisma.order.findMany({
      where,
      take: options?.take,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        coupon: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        coupon: true,
      },
    });
  }

  async updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        coupon: true,
      },
    });
  }

  async count(userId: string, status?: OrderStatus) {
    const where: Prisma.OrderWhereInput = { userId };
    if (status) {
      where.status = status;
    }
    return this.prisma.order.count({ where });
  }
}
