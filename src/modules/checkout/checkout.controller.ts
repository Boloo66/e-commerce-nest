import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ValidatedUser } from '../../common/interfaces/jwt-payload.interface';

@ApiTags('Checkout')
@ApiBearerAuth()
@Controller('checkout')
@UseGuards(RolesGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @ApiOperation({ summary: 'Process checkout and payment' })
  @ApiResponse({
    status: 200,
    description: 'Checkout processed',
    type: PaymentResponseDto,
  })
  async checkout(
    @CurrentUser() user: ValidatedUser,
    @Body() checkoutDto: CheckoutDto,
  ): Promise<PaymentResponseDto> {
    return this.checkoutService.checkout(user.id, checkoutDto);
  }
}
