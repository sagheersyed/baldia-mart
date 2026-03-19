import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { User } from '../users/user.entity';
import { Rider } from '../riders/rider.entity';
import * as firebaseAdmin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Rider)
    private ridersRepository: Repository<Rider>,
  ) {}

  private async saveNotification(title: string, body: string, userId?: string, riderId?: string, imageUrl?: string) {
    const notification = this.notificationsRepository.create({
      userId,
      riderId,
      title,
      body,
      imageUrl,
    });
    return this.notificationsRepository.save(notification);
  }

  async sendToUser(userId: string, fcmToken: string, title: string, body: string, imageUrl?: string) {
    await this.saveNotification(title, body, userId, undefined, imageUrl);

    if (fcmToken) {
      try {
        await firebaseAdmin.messaging().send({
          token: fcmToken,
          notification: { title, body, imageUrl },
          data: { imageUrl: imageUrl || '' } // Also send in data for some background handlers
        });
      } catch (error) {
        console.error('FCM Error (User):', error);
      }
    }
  }

  async sendToRider(riderId: string, fcmToken: string, title: string, body: string, imageUrl?: string) {
    await this.saveNotification(title, body, undefined, riderId, imageUrl);

    if (fcmToken) {
      try {
        await firebaseAdmin.messaging().send({
          token: fcmToken,
          notification: { title, body, imageUrl },
          data: { imageUrl: imageUrl || '' }
        });
      } catch (error) {
        console.error('FCM Error (Rider):', error);
      }
    }
  }

  async sendToAllUsers(title: string, body: string, imageUrl?: string) {
    const users = await this.usersRepository.find({
      where: { role: 'customer' },
      select: ['id', 'fcmToken'],
    });

    const tokens = users.map(u => u.fcmToken).filter(token => !!token);

    if (tokens.length > 0) {
      try {
        // Send in batches of 500 (Firebase limit)
        for (let i = 0; i < tokens.length; i += 500) {
          const batch = tokens.slice(i, i + 500);
          await firebaseAdmin.messaging().sendEachForMulticast({
            tokens: batch,
            notification: { title, body, imageUrl },
          });
        }
      } catch (error) {
        console.error('FCM Broadcast Error:', error);
      }
    }

    // Save in DB for each user
    const notifications = users.map(user => this.notificationsRepository.create({
      userId: user.id,
      title,
      body,
      imageUrl,
    }));
    await this.notificationsRepository.save(notifications);
  }
}
