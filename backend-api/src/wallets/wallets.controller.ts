import { Controller, Get, Post, Param, Body, UseGuards, Request, Query, ForbiddenException, Req } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { ManualSettleDto } from './dto/manual-settle.dto';
import { ApproveWithdrawalDto } from './dto/approve-withdrawal.dto';
import { RejectWithdrawalDto } from './dto/reject-withdrawal.dto';

@Controller('wallets')
@UseGuards(AuthGuard('jwt'))
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('my-wallet')
  async getMyWallet(@Req() req) {
    const user = req.user as any;
    const tenantId = req.headers['x-tenant-id'];
    let userType: 'Rider' | 'Vendor' | 'User' = 'User';
    if (user.role === 'rider') userType = 'Rider';
    else if (user.role === 'vendor' || user.role === 'restaurant') userType = 'Vendor';
    
    const wallet = await this.walletsService.getWalletWithTenantFallback(user.id, userType, tenantId);
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
  async manualSettle(@Req() req, @Body() body: ManualSettleDto) {
    const admin = req.user as any;
    return this.walletsService.manualSettle(body.walletId, body.amount, body.description, {
      adminId: admin.id,
      referenceId: body.referenceId,
      attachmentUrl: body.attachmentUrl
    });
  }

  @Post('withdraw-request')
  async createWithdrawalRequest(@Req() req, @Body() body: CreateWithdrawalRequestDto) {
    const user = req.user as any;
    const tenantId = req.headers['x-tenant-id'];
    let userType: 'Rider' | 'Vendor' | 'User' = 'User';
    if (user.role === 'rider') userType = 'Rider';
    else if (user.role === 'vendor' || user.role === 'restaurant') userType = 'Vendor';
    return this.walletsService.createWithdrawalRequest(user.id, userType, body, tenantId);
  }

  @Post('admin/withdraw-request')
  @UseGuards(AdminRoleGuard)
  async adminCreateWithdrawalRequest(@Body() body: any) {
    return this.walletsService.createWithdrawalRequest(body.userId, body.userType, body);
  }

  @Get('withdraw-requests/pending')
  @UseGuards(AdminRoleGuard)
  async getPendingWithdrawals() {
    return this.walletsService.getPendingWithdrawals();
  }

  @Post('withdraw-requests/:id/approve')
  @UseGuards(AdminRoleGuard)
  async approveWithdrawal(@Req() req, @Param('id') id: string, @Body() body: ApproveWithdrawalDto) {
    const admin = req.user as any;
    return this.walletsService.approveWithdrawal(id, admin.id, body.referenceId, body.notes);
  }

  @Post('withdraw-requests/:id/reject')
  @UseGuards(AdminRoleGuard)
  async rejectWithdrawal(@Param('id') id: string, @Body() body: RejectWithdrawalDto) {
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
