import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private isConnected = false;

  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.isConnected = true;
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.isConnected = false;
  }

  getPrismaClient(): PrismaClient {
    if (!this.isConnected) {
      throw new Error('Prisma client is not connected');
    }
    return this;
  }
}
