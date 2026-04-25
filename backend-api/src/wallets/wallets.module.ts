import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { WithdrawalRequest } from './withdrawal-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet, WalletTransaction, WithdrawalRequest])],
  providers: [WalletsService],
  controllers: [WalletsController],
  exports: [WalletsService]
})
export class WalletsModule {}
