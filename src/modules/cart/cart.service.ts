import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CartRepository } from './cart.repository';
import { ProductsRepository } from '../products/products.repository';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { RedisService } from '../cache/redis.service';
import { PrismaService } from '../database/prisma.service';
import { CartItem } from '@prisma/client';

@Injectable()
export class CartService {
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor(
    private repository: CartRepository,
    private productsRepository: ProductsRepository,
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const cartItem = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: addToCartDto.productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (!product.isActive) {
        throw new BadRequestException('Product is not available');
      }

      const existingCartItem = await tx.cartItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId: addToCartDto.productId,
          },
        },
      });

      const totalQuantity = existingCartItem
        ? existingCartItem.quantity + addToCartDto.quantity
        : addToCartDto.quantity;

      if (product.stock < totalQuantity) {
        throw new BadRequestException('Insufficient stock');
      }

      return tx.cartItem.upsert({
        where: {
          userId_productId: {
            userId,
            productId: addToCartDto.productId,
          },
        },
        update: {
          quantity: {
            increment: addToCartDto.quantity,
          },
        },
        create: {
          userId,
          productId: addToCartDto.productId,
          quantity: addToCartDto.quantity,
        },
        include: {
          product: true,
        },
      });
    });

    await this.invalidateCartCache(userId);
    return cartItem;
  }

  async getCart(userId: string) {
    const cacheKey = `cart:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as {
        items: CartItem[];
        subtotal: number;
        totalItems: number;
      };
    }

    const items = await this.repository.findUserCart(userId);

    const cartItems = items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      price: Number(item.product.price),
      quantity: item.quantity,
      total: Number(item.product.price) * item.quantity,
      stock: item.product.stock,
      isActive: item.product.isActive,
    }));

    const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);

    const result = {
      items: cartItems,
      subtotal,
      totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  async updateCartItem(
    userId: string,
    productId: string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const cartItem = await this.prisma.$transaction(async (tx) => {
      const existingCartItem = await tx.cartItem.findUnique({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        include: {
          product: true,
        },
      });

      if (!existingCartItem) {
        throw new NotFoundException('Cart item not found');
      }

      if (existingCartItem.product.stock < updateCartItemDto.quantity) {
        throw new BadRequestException('Insufficient stock');
      }

      return tx.cartItem.update({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
        data: { quantity: updateCartItemDto.quantity },
        include: {
          product: true,
        },
      });
    });

    await this.invalidateCartCache(userId);
    return cartItem;
  }

  async removeFromCart(userId: string, productId: string) {
    const cartItem = await this.repository.findCartItem(userId, productId);

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.repository.removeItem(userId, productId);
    await this.invalidateCartCache(userId);

    return { message: 'Item removed from cart' };
  }

  async clearCart(userId: string) {
    await this.repository.clearCart(userId);
    await this.invalidateCartCache(userId);
    return { message: 'Cart cleared' };
  }

  private async invalidateCartCache(userId: string) {
    await this.redis.del(`cart:${userId}`);
  }
}
