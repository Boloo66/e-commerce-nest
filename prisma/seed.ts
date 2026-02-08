import {
  PrismaClient,
  Role,
  DiscountType,
  CouponRuleType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

/* eslint-disable @typescript-eslint/no-unused-vars */

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.couponRule.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@example.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: Role.USER,
    },
  });

  console.log('Created users:', {
    admin: adminUser.email,
    user: regularUser.email,
  });

  const products = await Promise.all([
    // Electronics
    prisma.product.create({
      data: {
        name: 'iPhone 15 Pro',
        description: 'Latest Apple smartphone with A17 Pro chip',
        price: 999.99,
        stock: 50,
        category: 'Electronics',
        sku: 'IPH15PRO-256-BLK',
        imageUrl: 'https://example.com/iphone15pro.jpg',
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'MacBook Pro 16"',
        description: 'Powerful laptop with M3 Max chip',
        price: 2499.99,
        stock: 30,
        category: 'Electronics',
        sku: 'MBP16-M3MAX-1TB',
        imageUrl: 'https://example.com/macbookpro.jpg',
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'AirPods Pro 2',
        description: 'Premium wireless earbuds with active noise cancellation',
        price: 249.99,
        stock: 100,
        category: 'Electronics',
        sku: 'APP2-WHT',
        imageUrl: 'https://example.com/airpodspro.jpg',
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'iPad Air',
        description: 'Versatile tablet with M1 chip',
        price: 599.99,
        stock: 75,
        category: 'Electronics',
        sku: 'IPAD-AIR-M1-256',
        imageUrl: 'https://example.com/ipadair.jpg',
        isActive: true,
      },
    }),

    // Clothing
    prisma.product.create({
      data: {
        name: 'Classic Cotton T-Shirt',
        description: 'Premium cotton t-shirt available in multiple colors',
        price: 29.99,
        stock: 200,
        category: 'Clothing',
        sku: 'TSH-COT-BLU-L',
        imageUrl: 'https://example.com/tshirt.jpg',
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Slim Fit Jeans',
        description: 'Comfortable denim jeans with modern fit',
        price: 79.99,
        stock: 150,
        category: 'Clothing',
        sku: 'JNS-DEN-BLU-32',
        imageUrl: 'https://example.com/jeans.jpg',
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Winter Jacket',
        description: 'Warm and stylish winter jacket',
        price: 149.99,
        stock: 80,
        category: 'Clothing',
        sku: 'JKT-WIN-BLK-L',
        imageUrl: 'https://example.com/jacket.jpg',
        isActive: true,
      },
    }),

    // Home & Kitchen
    prisma.product.create({
      data: {
        name: 'Coffee Maker Deluxe',
        description: 'Programmable coffee maker with thermal carafe',
        price: 89.99,
        stock: 60,
        category: 'Home',
        sku: 'COF-MAK-DLX',
        imageUrl: 'https://example.com/coffeemaker.jpg',
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Blender Pro 3000',
        description: 'High-power blender for smoothies and more',
        price: 129.99,
        stock: 45,
        category: 'Home',
        sku: 'BLN-PRO-3000',
        imageUrl: 'https://example.com/blender.jpg',
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Non-Stick Pan Set',
        description: '5-piece non-stick cookware set',
        price: 99.99,
        stock: 70,
        category: 'Home',
        sku: 'PAN-SET-5PC',
        imageUrl: 'https://example.com/panset.jpg',
        isActive: true,
      },
    }),

    // Books
    prisma.product.create({
      data: {
        name: 'The Great Novel',
        description: 'Bestselling fiction book',
        price: 24.99,
        stock: 120,
        category: 'Books',
        sku: 'BK-FIC-GRN-001',
        imageUrl: 'https://example.com/book1.jpg',
        isActive: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Learn Programming',
        description: 'Comprehensive programming guide',
        price: 49.99,
        stock: 90,
        category: 'Books',
        sku: 'BK-TEC-PRG-002',
        imageUrl: 'https://example.com/book2.jpg',
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${products.length} products`);

  // Create Coupons

  // 1. Simple percentage discount
  const percentageCoupon = await prisma.coupon.create({
    data: {
      code: 'SAVE20',
      type: DiscountType.PERCENTAGE,
      value: 20,
      minPurchase: 100,
      maxDiscount: 50,
      usageLimit: 100,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2026-12-31'),
    },
  });

  // 2. Fixed amount discount
  const fixedCoupon = await prisma.coupon.create({
    data: {
      code: 'FLAT50',
      type: DiscountType.FIXED,
      value: 50,
      minPurchase: 200,
      maxDiscount: 50,
      usageLimit: 50,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2026-12-31'),
    },
  });

  // 3. Product-specific discount with rules
  const electronicsProduct = products.find((p) => p.category === 'Electronics');
  const productCoupon = await prisma.coupon.create({
    data: {
      code: 'ELECTRONICS15',
      type: DiscountType.PERCENTAGE,
      value: 0, // Base value, actual discount in rules
      minPurchase: 0,
      maxDiscount: 0,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2026-12-31'),
      rules: {
        create: [
          {
            type: CouponRuleType.PRODUCT,
            productId: electronicsProduct?.id,
            discountPercentage: 15,
            priority: 1,
          },
        ],
      },
    },
  });

  // 4. Category-based discount
  const categoryCoupon = await prisma.coupon.create({
    data: {
      code: 'CLOTHING25',
      type: DiscountType.PERCENTAGE,
      value: 0,
      minPurchase: 0,
      maxDiscount: 0,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2026-12-31'),
      rules: {
        create: [
          {
            type: CouponRuleType.CATEGORY,
            categoryId: 'Clothing',
            discountPercentage: 25,
            priority: 2,
          },
        ],
      },
    },
  });

  // 5. Buy X Get Y discount
  const tshirtProduct = products.find(
    (p) => p.name === 'Classic Cotton T-Shirt',
  );
  const buyXGetYCoupon = await prisma.coupon.create({
    data: {
      code: 'BUY2GET1',
      type: DiscountType.BUY_X_GET_Y,
      value: 0,
      minPurchase: 0,
      maxDiscount: 0,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2026-12-31'),
      rules: {
        create: [
          {
            type: CouponRuleType.BUY_X_GET_Y,
            productId: tshirtProduct?.id,
            buyQuantity: 2,
            getQuantity: 1,
            priority: 3,
          },
        ],
      },
    },
  });

  // 6. Complex multi-rule coupon
  const multiRuleCoupon = await prisma.coupon.create({
    data: {
      code: 'MEGA50',
      type: DiscountType.PERCENTAGE,
      value: 10, // Base 10% discount
      minPurchase: 500,
      maxDiscount: 200,
      usageLimit: 20,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2026-12-31'),
      rules: {
        create: [
          {
            type: CouponRuleType.CATEGORY,
            categoryId: 'Electronics',
            discountPercentage: 15,
            priority: 5,
          },
          {
            type: CouponRuleType.CATEGORY,
            categoryId: 'Home',
            discountPercentage: 20,
            priority: 4,
          },
        ],
      },
    },
  });

  // 7. Free shipping coupon
  const freeShippingCoupon = await prisma.coupon.create({
    data: {
      code: 'FREESHIP',
      type: DiscountType.FREE_SHIPPING,
      value: 0,
      minPurchase: 75,
      maxDiscount: 0,
      isActive: true,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2026-12-31'),
    },
  });

  console.log('Created 7 coupons with various discount types');

  // Create sample cart items for regular user
  await prisma.cartItem.createMany({
    data: [
      {
        userId: regularUser.id,
        productId: products[0].id, // iPhone
        quantity: 1,
      },
      {
        userId: regularUser.id,
        productId: products[2].id, // AirPods
        quantity: 2,
      },
      {
        userId: regularUser.id,
        productId: products[4].id, // T-Shirt
        quantity: 3,
      },
    ],
  });

  console.log('Created sample cart items for regular user');

  // Create a sample completed order
  const sampleOrder = await prisma.order.create({
    data: {
      userId: regularUser.id,
      orderNumber: `ORD-${Date.now()}-SAMPLE`,
      subtotal: 1299.97,
      discount: 259.99,
      total: 1039.98,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      couponId: percentageCoupon.id,
      items: {
        create: [
          {
            productId: products[0].id,
            quantity: 1,
            price: 999.99,
            discount: 199.99,
            total: 800.0,
          },
          {
            productId: products[2].id,
            quantity: 1,
            price: 249.99,
            discount: 50.0,
            total: 199.99,
          },
        ],
      },
    },
  });

  console.log('Created sample order:', sampleOrder.orderNumber);

  console.log('Database seeding completed successfully!');
  console.log('\n=== Test Credentials ===');
  console.log('Admin - Email: admin@example.com, Password: Password123!');
  console.log('User  - Email: user@example.com, Password: Password123!');
  console.log('\n=== Available Coupons ===');
  console.log('1. SAVE20 - 20% off (min $100, max discount $50)');
  console.log('2. FLAT50 - $50 off (min $200)');
  console.log('3. ELECTRONICS15 - 15% off on specific electronics product');
  console.log('4. CLOTHING25 - 25% off all clothing items');
  console.log('5. BUY2GET1 - Buy 2 t-shirts, get 1 free');
  console.log('6. MEGA50 - Multi-tier discount (10% base + category bonuses)');
  console.log('7. FREESHIP - Free shipping (min $75)');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
