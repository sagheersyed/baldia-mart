import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import * as firebaseAdmin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  async sendToUser(userId: string, fcmToken: string, title: string, body: string) {
    // Save to DB
    const notification = this.notificationsRepository.create({
      userId,
      title,
      body,
    });
    await this.notificationsRepository.save(notification);

    // Send via FCM if token exists
    if (fcmToken) {
      try {
        await firebaseAdmin.messaging().send({
          token: fcmToken,
          notification: { title, body },
        });
      } catch (error) {
        console.error('FCM Error:', error);
      }
    }
  }

  async sendToRider(riderId: string, fcmToken: string, title: string, body: string) {
    const notification = this.notificationsRepository.create({
      riderId,
      title,
      body,
    });
    await this.notificationsRepository.save(notification);

    if (fcmToken) {
      try {
        await firebaseAdmin.messaging().send({
          token: fcmToken,
          notification: { title, body },
        });
      } catch (error) {
        console.error('FCM Error:', error);
      }
    }
  }
}
