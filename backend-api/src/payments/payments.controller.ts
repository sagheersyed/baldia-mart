import {
  Controller, Post, Get, Body, Param, Req, Res,
  UseGuards, Logger, HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { Request, Response } from 'express';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /api/v1/payments/initiate
   * Authenticated user initiates a payment for an order.
   * Returns { formUrl, formFields } for the mobile app to open in a WebView.
   */
  @Post('initiate')
  @UseGuards(AuthGuard('jwt'))
  async initiate(@Req() req: Request, @Body() body: InitiatePaymentDto) {
    const user = req.user as any;
    return this.paymentsService.initiatePayment({
      orderId: body.orderId,
      userId: user.id,
      provider: body.provider as 'jazzcash' | 'easypaisa',
      amount: body.amount,
      mobileNumber: body.mobileNumber,
    });
  }

  /**
   * POST /api/v1/payments/callback/jazzcash
   * POST /api/v1/payments/callback/easypaisa
   *
   * Server-to-server callback from the provider.
   * Also serves as the return URL for hosted checkout redirects.
   * No JWT guard — this is called by the provider servers.
   */
  @Post('callback/:provider')
  @HttpCode(200)
  async handleCallback(
    @Param('provider') provider: string,
    @Body() payload: Record<string, any>,
    @Res() res: Response,
  ) {
    this.logger.log(`Callback hit for provider: ${provider}`);

    try {
      const payment = await this.paymentsService.handleCallback(provider, payload);

      // Build a redirect page that the mobile WebView can detect
      const statusPage = payment.status === 'paid' ? 'success' : 'failed';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Payment ${statusPage === 'success' ? 'Successful' : 'Failed'}</title>
          <style>
            body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
            .card { text-align: center; background: #fff; padding: 40px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .icon { font-size: 64px; margin-bottom: 16px; }
            .title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
            .msg { color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">${statusPage === 'success' ? '✅' : '❌'}</div>
            <div class="title">${statusPage === 'success' ? 'Payment Successful!' : 'Payment Failed'}</div>
            <div class="msg">${payment.responseMessage || (statusPage === 'success' ? 'Your payment has been processed.' : 'Something went wrong.')}</div>
            <div class="msg" style="margin-top:12px;color:#999;">Ref: ${payment.merchantRef}</div>
          </div>
          <script>
            // Signal to the mobile WebView to close
            try {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAYMENT_RESULT',
                status: '${payment.status}',
                paymentId: '${payment.id}',
                orderId: '${payment.orderId}',
                merchantRef: '${payment.merchantRef}'
              }));
            } catch(e) {}
          </script>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      this.logger.error(`Callback error for ${provider}: ${error.message}`);
      res.status(200).send(`
        <html><body>
          <h2>Payment Processing Error</h2>
          <p>${error.message}</p>
        </body></html>
      `);
    }
  }

  /**
   * GET /api/v1/payments/status/:paymentId
   * Check the status of a payment.
   */
  @Get('status/:paymentId')
  @UseGuards(AuthGuard('jwt'))
  async getStatus(@Req() req: Request, @Param('paymentId') paymentId: string) {
    const user = req.user as any;
    return this.paymentsService.getPaymentByIdForUser(paymentId, user.id);
  }

  /**
   * GET /api/v1/payments/order/:orderId
   * Get the latest payment for an order.
   */
  @Get('order/:orderId')
  @UseGuards(AuthGuard('jwt'))
  async getByOrder(@Req() req: Request, @Param('orderId') orderId: string) {
    const user = req.user as any;
    return this.paymentsService.getPaymentByOrderIdForUser(orderId, user.id);
  }
}
