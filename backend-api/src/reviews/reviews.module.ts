import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessReview } from '../common/business-review.entity';
import { Order } from '../orders/order.entity';
import { Restaurant } from '../restaurants/restaurant.entity';
import { Brand } from '../brands/brand.entity';
import { BusinessReviewsService } from './business-reviews.service';
import { BusinessReviewsController } from './business-reviews.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessReview, Order, Restaurant, Brand]),
  ],
  providers: [BusinessReviewsService],
  controllers: [BusinessReviewsController],
  exports: [BusinessReviewsService],
})
export class ReviewsModule {}
