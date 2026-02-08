import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CouponsRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCouponDto) {
    const { rules, validFrom, validUntil, ...rest } = data;

    return this.prisma.coupon.create({
      data: {
        code: rest.code,
        type: rest.type,
        value: new Prisma.Decimal(rest.value),
        minPurchase: rest.minPurchase
          ? new Prisma.Decimal(rest.minPurchase)
          : new Prisma.Decimal(0),
        maxDiscount: rest.maxDiscount
          ? new Prisma.Decimal(rest.maxDiscount)
          : new Prisma.Decimal(0),
        usageLimit: rest.usageLimit,
        isActive: rest.isActive ?? true,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        rules: rules
          ? {
              create: rules.map((rule) => ({
                type: rule.type,
                productId: rule.productId,
                categoryId: rule.categoryId,
                discountPercentage: rule.discountPercentage
                  ? new Prisma.Decimal(rule.discountPercentage)
                  : null,
                discountFixed: rule.discountFixed
                  ? new Prisma.Decimal(rule.discountFixed)
                  : null,
                buyQuantity: rule.buyQuantity,
                getQuantity: rule.getQuantity,
                priority: rule.priority || 0,
              })),
            }
          : undefined,
      },
      include: {
        rules: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      include: {
        rules: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.coupon.findUnique({
      where: { id },
      include: {
        rules: {
          include: {
            product: true,
          },
          orderBy: { priority: 'desc' },
        },
      },
    });
  }

  async findByCode(code: string) {
    return this.prisma.coupon.findUnique({
      where: { code },
      include: {
        rules: {
          include: {
            product: true,
          },
          orderBy: { priority: 'desc' },
        },
      },
    });
  }

  async update(id: string, data: UpdateCouponDto) {
    const { ...couponData } = data;

    const updateData: Record<string, unknown> = { ...couponData };
    if (couponData.value !== undefined) {
      updateData.value = new Prisma.Decimal(couponData.value);
    }
    if (couponData.minPurchase !== undefined) {
      updateData.minPurchase = new Prisma.Decimal(couponData.minPurchase);
    }
    if (couponData.maxDiscount !== undefined) {
      updateData.maxDiscount = new Prisma.Decimal(couponData.maxDiscount);
    }

    return this.prisma.coupon.update({
      where: { id },
      data: updateData,
      include: {
        rules: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    return this.prisma.coupon.delete({ where: { id } });
  }

  async incrementUsage(id: string) {
    return this.prisma.coupon.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }
}
