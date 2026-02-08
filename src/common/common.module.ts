import { Module } from '@nestjs/common';
import { CustomLoggerService } from './services/custom-logger.service';

@Module({
  providers: [CustomLoggerService],
  exports: [CustomLoggerService],
})
export class CommonModule {}
