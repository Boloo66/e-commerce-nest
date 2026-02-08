# E-Commerce Backend API

A comprehensive e-commerce backend API built with NestJS, TypeScript, PostgreSQL, Prisma, and Redis.

## Features

- User authentication with JWT
- Role-based access control (Admin/User)
- Product management with pagination and filtering
- Shopping cart functionality
- Advanced coupon system with multiple discount types
- Order processing and management
- Mock payment integration
- Redis caching for performance
- Rate limiting for security
- Comprehensive API documentation with Swagger
- Full TypeScript support with strict type checking

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis
- **Authentication**: JWT (Passport)
- **Validation**: class-validator, class-transformer
- **Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, Rate limiting

## Prerequisites

- Node.js (v20 or higher)
- Docker and Docker Compose
- pnpm or yarn

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd ecommerce-backend
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public"

JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRATION=1h
JWT_REFRESH_SECRET=your-refresh-token-secret-change-in-production-min-32-chars
JWT_REFRESH_EXPIRATION=7d

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

THROTTLE_TTL=60000
THROTTLE_LIMIT=100

CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 4. Start Docker services

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 6. Seed the database

```bash
npx prisma db seed
```

This will create:

- Admin user: `admin@example.com` / `Password123!`
- Regular user: `user@example.com` / `Password123!`
- Sample products across multiple categories
- Various coupon types for testing

### 7. Start the application

```bash
# Development mode
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

The API will be available at `http://localhost:3000`

## API Documentation

Once the application is running, access the Swagger documentation at:

```
http://localhost:3000/api/docs
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user

### Products

- `GET /api/v1/products` - Get all products (public)
- `GET /api/v1/products/:id` - Get single product (public)
- `POST /api/v1/products` - Create product (Admin only)
- `PATCH /api/v1/products/:id` - Update product (Admin only)
- `DELETE /api/v1/products/:id` - Delete product (Admin only)

### Cart

- `GET /api/v1/cart` - Get user cart
- `POST /api/v1/cart` - Add item to cart
- `PATCH /api/v1/cart/:productId` - Update cart item
- `DELETE /api/v1/cart/:productId` - Remove item from cart
- `DELETE /api/v1/cart` - Clear cart

### Orders

- `GET /api/v1/orders` - Get order history
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders` - Create order from cart
- `PATCH /api/v1/orders/:id/status` - Update order status (Admin only)

### Coupons

- `GET /api/v1/coupons` - Get all coupons (Admin only)
- `GET /api/v1/coupons/:id` - Get coupon details (Admin only)
- `POST /api/v1/coupons` - Create coupon (Admin only)
- `PATCH /api/v1/coupons/:id` - Update coupon (Admin only)
- `DELETE /api/v1/coupons/:id` - Delete coupon (Admin only)
- `POST /api/v1/coupons/validate` - Validate coupon code

### Checkout

- `POST /api/v1/checkout` - Process checkout with payment

## Coupon System

The application includes a comprehensive coupon system with the following features:

### Coupon Types

1. **Fixed Amount Discount**
   - Example: `FLAT50` - $50 off orders over $200

2. **Percentage Discount**
   - Example: `SAVE20` - 20% off (min $100, max discount $50)

3. **Product-Specific Discount**
   - Example: `ELECTRONICS15` - 15% off specific products

4. **Category-Based Discount**
   - Example: `CLOTHING25` - 25% off all clothing items

5. **Buy X Get Y**
   - Example: `BUY2GET1` - Buy 2 t-shirts, get 1 free

6. **Free Shipping**
   - Example: `FREESHIP` - Free shipping on orders over $75

7. **Multi-Rule Complex Discounts**
   - Example: `MEGA50` - Base discount + category-specific bonuses

### Testing Coupons

Available test coupons (seeded automatically):

```
SAVE20        - 20% off (min $100, max $50)
FLAT50        - $50 off (min $200)
ELECTRONICS15 - 15% off electronics
CLOTHING25    - 25% off clothing
BUY2GET1      - Buy 2 get 1 free on t-shirts
```

## Database Schema

Key entities:

- **User** - User accounts with role-based access
- **Product** - Product catalog with inventory
- **CartItem** - Shopping cart items
- **Order** - Order records with status tracking
- **OrderItem** - Individual order line items
- **Coupon** - Discount coupons
- **CouponRule** - Complex coupon rules

## Development

### Run in development mode with hot reload

```bash
pnpm run start:dev
```

### Format code

```bash
pnpm run format
```

### Lint code

```bash
pnpm run lint
```

### Generate Prisma client

```bash
npx prisma generate
```

### Create new migration

```bash
npx prisma migrate dev --name migration_name
```

### View database in Prisma Studio

```bash
npx prisma studio
```

## Testing the API

### Using Swagger UI

1. Navigate to `http://localhost:3000/api/docs`
2. Click "Authorize" and enter your JWT token
3. Test endpoints directly from the browser

### Using cURL

#### Register a new user

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

#### Get products

```bash
curl -X GET http://localhost:3000/api/v1/products
```

#### Add to cart (requires auth)

```bash
curl -X POST http://localhost:3000/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productId": "product-uuid",
    "quantity": 2
  }'
```

#### Checkout with coupon

```bash
curl -X POST http://localhost:3000/api/v1/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "couponCode": "SAVE20",
    "paymentMethod": "card"
  }'
```

## Production Deployment

### Environment Variables for Production

Ensure you set secure values for:

- `JWT_SECRET` - Use a strong random string (32+ characters)
- `JWT_REFRESH_SECRET` - Use a different strong random string
- `DATABASE_URL` - Your production database URL
- `REDIS_HOST` and `REDIS_PASSWORD` - Production Redis credentials

### Build for production

```bash
pnpm run build
```

### Start production server

```bash
pnpm run start:prod
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Rate limiting (100 requests per minute)
- Helmet for HTTP security headers
- CORS configuration
- Input validation and sanitization
- SQL injection protection (Prisma)
- Environment variable protection

## Performance Optimizations

- Redis caching for frequently accessed data
- Cursor-based pagination for large datasets
- Database indexing on frequently queried fields
- Connection pooling with Prisma

## License

MIT License

## Support

For issues and questions, please create an issue in the repository.
