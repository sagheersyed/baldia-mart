import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { RidersService } from '../riders/riders.service';
import { Rider } from '../riders/rider.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private ridersService: RidersService,
    private jwtService: JwtService,
  ) {}

  async validateFirebaseUser(firebaseUser: any): Promise<{ user: User; isNew: boolean }> {
    const { uid, email, name, picture } = firebaseUser;
    let user = await this.usersService.findByFirebaseUid(uid);
    let isNew = false;
    
    if (!user) {
      // Auto-register via Firebase data from OAuth
      user = await this.usersService.create({
        firebaseUid: uid,
        email: email || `${uid}@placeholder.email`, // Fallback for phone-auth
        name: name || 'Valued Customer',
      });
      isNew = true;
    }

    return { user, isNew };
  }

  async findOrCreateByPhone(phoneNumber: string): Promise<{ user: User; isNew: boolean }> {
    let user = await this.usersService.findByPhone(phoneNumber);
    let isNew = false;
    if (!user) {
      user = await this.usersService.create({
        phoneNumber,
        name: 'New Customer',
        isPhoneVerified: false,
      });
      isNew = true;
    }
    return { user, isNew };
  }

  async loginWithPhone(user: User) {
    // Mark as verified on successful login via OTP
    if (!user.isPhoneVerified) {
      await this.usersService.update(user.id, { isPhoneVerified: true });
    }
    return this.login(user);
  }

  login(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  }

  // --- RIDER AUTHENTICATION ---

  async findOrCreateRiderByPhone(phoneNumber: string): Promise<{ rider: Rider; isNew: boolean }> {
    let rider = await this.ridersService.findByPhone(phoneNumber);
    let isNew = false;
    if (!rider) {
      rider = await this.ridersService.create({
        phoneNumber,
        name: 'New Rider',
        firebaseUid: `rider_${Date.now()}`, // Placeholder since we don't have proper firebase rider setup yet
        email: `rider_${Date.now()}@baldia.mart`
      });
      isNew = true;
    }
    return { rider, isNew };
  }

  async loginRider(rider: Rider) {
    // Note: Generating a token with role = 'rider'
    const payload = { sub: rider.id, phone: rider.phoneNumber, role: 'rider' };
    return {
      access_token: this.jwtService.sign(payload),
      rider: {
        id: rider.id,
        phoneNumber: rider.phoneNumber,
        name: rider.name,
        role: 'rider',
        isProfileComplete: rider.isProfileComplete
      }
    };
  }
}
