import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { RedisService } from '../cache/redis.service';
import { PrismaService } from '../database/prisma.service';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { Product } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private repository: ProductsRepository,
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const product = await this.repository.create(createProductDto);
    await this.invalidateCache();
    return product;
  }

  async findAll(query: ProductQueryDto): Promise<PaginatedResponse<Product>> {
    const { category, search, limit = 10, cursor } = query;

    const cacheKey = `products:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as PaginatedResponse<Product>;
    }

    const where: Record<string, unknown> = { isActive: true };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await this.repository.findAll({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      where,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = products.length > limit;
    const data = hasMore ? products.slice(0, -1) : products;
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;

    const total = await this.repository.count(where);

    const result = {
      data,
      meta: {
        total,
        hasMore,
        nextCursor,
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  async findOne(id: string) {
    const cacheKey = `product:${id}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as Product;
    }

    const product = await this.repository.findOne(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.redis.set(cacheKey, JSON.stringify(product), this.CACHE_TTL);
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id);
    const product = await this.repository.update(id, updateProductDto);
    await this.invalidateCache();
    await this.redis.del(`product:${id}`);
    return product;
  }

  async remove(id: string) {
    await this.findOne(id);

    const product = await this.prisma.$transaction(async (tx) => {
      const pendingOrders = await tx.orderItem.findFirst({
        where: {
          productId: id,
          order: {
            status: {
              in: ['PENDING', 'PROCESSING'],
            },
          },
        },
      });

      if (pendingOrders) {
        throw new BadRequestException(
          'Cannot delete product with pending orders',
        );
      }

      return tx.product.update({
        where: { id },
        data: { isActive: false },
      });
    });

    await this.invalidateCache();
    await this.redis.del(`product:${id}`);
    return product;
  }

  private async invalidateCache() {
    await this.redis.delPattern('products:*');
  }
}
