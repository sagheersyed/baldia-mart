import { Controller, Get, Post, Param, Body, UseGuards, Request, Query, ForbiddenException, Req } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('wallets')
@UseGuards(AuthGuard('jwt'))
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('my-wallet')
  async getMyWallet(@Req() req) {
    const user = req.user as any;
    const userId = user.id;
    let userType: 'Rider' | 'Vendor' | 'User' = 'User';
    if (user.role === 'rider') userType = 'Rider';
    else if (user.role === 'vendor' || user.role === 'restaurant') userType = 'Vendor';
    
    const wallet = await this.walletsService.getWallet(userId, userType);
    const history = await this.walletsService.getWalletHistory(wallet.id);

    return { wallet, history };
  }

  @Get('all')
  @UseGuards(AdminRoleGuard)
  async getAllWallets(@Query('userType') userType?: string) {
    return this.walletsService.getAllWallets(userType);
  }

  @Post('settle-manual')
  @UseGuards(AdminRoleGuard)
  async manualSettle(@Req() req, @Body() body: { walletId: string; amount: number; description: string; referenceId: string; attachmentUrl?: string }) {
    const admin = req.user as any;
    return this.walletsService.manualSettle(body.walletId, body.amount, body.description, {
      adminId: admin.id,
      referenceId: body.referenceId,
      attachmentUrl: body.attachmentUrl
    });
  }

  @Post('withdraw-request')
  async createWithdrawalRequest(@Req() req, @Body() body: any) {
    const user = req.user as any;
    const userType = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    return this.walletsService.createWithdrawalRequest(user.id, userType, body);
  }

  @Get('withdraw-requests/pending')
  @UseGuards(AdminRoleGuard)
  async getPendingWithdrawals() {
    return this.walletsService.getPendingWithdrawals();
  }

  @Post('withdraw-requests/:id/approve')
  @UseGuards(AdminRoleGuard)
  async approveWithdrawal(@Req() req, @Param('id') id: string, @Body() body: { referenceId: string; notes?: string }) {
    const admin = req.user as any;
    return this.walletsService.approveWithdrawal(id, admin.id, body.referenceId, body.notes);
  }

  @Post('withdraw-requests/:id/reject')
  @UseGuards(AdminRoleGuard)
  async rejectWithdrawal(@Param('id') id: string, @Body() body: { notes: string }) {
    return this.walletsService.rejectWithdrawal(id, body.notes);
  }

  @Get(':userId/:userType')
  @UseGuards(AdminRoleGuard)
  async getWalletForAdmin(@Param('userId') userId: string, @Param('userType') userType: 'Rider' | 'Vendor' | 'User') {
    const wallet = await this.walletsService.getWallet(userId, userType);
    const history = await this.walletsService.getWalletHistory(wallet.id);
    return { wallet, history };
  }
}
