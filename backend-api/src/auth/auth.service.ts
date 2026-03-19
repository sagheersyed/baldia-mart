import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
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
    } else {
      // Reset MPIN attempts on successful Google Login
      await this.usersService.update(user.id, { mpinAttempts: 0 });
    }

    return { user, isNew };
  }

  async findOrCreateByPhone(phoneNumber: string): Promise<{ user: User; isNew: boolean }> {
    let user = await this.usersService.findByPhoneNumber(phoneNumber);
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
    // Mark as verified on successful login via OTP and reset MPIN attempts
    const updateData: Partial<User> = { mpinAttempts: 0 };
    if (!user.isPhoneVerified) {
      updateData.isPhoneVerified = true;
    }
    await this.usersService.update(user.id, updateData);
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
        role: user.role,
        phoneNumber: user.phoneNumber,
      }
    };
  }

  async adminLogin(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.role !== 'admin' || !user.password) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    const payload = { sub: user.id, email: user.email, role: 'admin' };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'admin',
      },
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
    // Reset MPIN attempts on successful login (OTP or Setup)
    await this.ridersService.update(rider.id, { mpinAttempts: 0 });
    
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

  // --- MPIN LOGIC ---
  async setupMpin(userId: string, mpin: string, role: 'customer' | 'rider') {
    const hashedMpin = await bcrypt.hash(mpin, 10);
    if (role === 'customer') {
      await this.usersService.update(userId, { mpin: hashedMpin, mpinAttempts: 0 });
    } else {
      await this.ridersService.update(userId, { mpin: hashedMpin, mpinAttempts: 0 });
    }
    return { success: true, message: 'MPIN setup successfully' };
  }

  async loginWithMpin(phoneNumber: string, mpin: string, role: 'customer' | 'rider') {
    let userOrRider: User | Rider | null = null;
    
    if (role === 'customer') {
      userOrRider = await this.usersService.findByPhoneNumber(phoneNumber);
    } else {
      userOrRider = await this.ridersService.findByPhone(phoneNumber);
    }

    if (!userOrRider) throw new UnauthorizedException('User not found');
    if (!userOrRider.mpin) throw new UnauthorizedException('MPIN not set up');

    // Check for Lock
    if (userOrRider.mpinAttempts >= 3) {
      throw new ForbiddenException('Account locked due to 3 failed MPIN attempts. Please reset using Google Login or OTP.');
    }

    const isMatch = await bcrypt.compare(mpin, userOrRider.mpin);
    if (!isMatch) {
      // Increment attempts
      const newAttempts = userOrRider.mpinAttempts + 1;
      if (role === 'customer') {
        await this.usersService.update(userOrRider.id, { mpinAttempts: newAttempts });
      } else {
        await this.ridersService.update(userOrRider.id, { mpinAttempts: newAttempts });
      }

      if (newAttempts >= 3) {
        throw new ForbiddenException('Account locked due to 3 failed MPIN attempts. Please reset using Google Login or OTP.');
      }
      throw new UnauthorizedException(`Invalid MPIN. ${3 - newAttempts} attempts remaining.`);
    }

    // Success - reset attempts
    if (role === 'customer') {
      await this.usersService.update(userOrRider.id, { mpinAttempts: 0 });
      const authResponse = this.login(userOrRider as User);
      return { ...authResponse, isNewUser: false };
    } else {
      await this.ridersService.update(userOrRider.id, { mpinAttempts: 0 });
      const authResponse = await this.loginRider(userOrRider as Rider);
      return { ...authResponse, isNewUser: false };
    }
  }

  async checkStatus(phoneNumber: string, role: string) {
    let userOrRider: any;
    if (role === 'rider') {
      userOrRider = await this.ridersService.findByPhone(phoneNumber);
    } else {
      userOrRider = await this.usersService.findByPhoneNumber(phoneNumber);
    }
    return {
      exists: !!userOrRider,
      hasMpin: !!userOrRider?.mpin
    };
  }

  async registerWithMpin(phoneNumber: string, mpin: string, role: 'customer' | 'rider') {
    const hashedMpin = await bcrypt.hash(mpin, 10);
    let userOrRider: User | Rider | null = null;
    let isNew = false;

    if (role === 'customer') {
      userOrRider = await this.usersService.findByPhoneNumber(phoneNumber);
      if (userOrRider && userOrRider.mpin) {
        throw new UnauthorizedException('Customer already has an MPIN. Please use it to log in.');
      }
      if (!userOrRider) {
        userOrRider = await this.usersService.create({
          phoneNumber,
          name: 'New Customer',
          isPhoneVerified: false,
          mpin: hashedMpin
        });
        isNew = true;
      } else {
        await this.usersService.update(userOrRider.id, { mpin: hashedMpin });
      }
    } else {
      userOrRider = await this.ridersService.findByPhone(phoneNumber);
      if (userOrRider && userOrRider.mpin) {
        throw new UnauthorizedException('Rider already has an MPIN. Please use it to log in.');
      }
      if (!userOrRider) {
        userOrRider = await this.ridersService.create({
          phoneNumber,
          name: 'New Rider',
          firebaseUid: `rider_${Date.now()}`,
          email: `rider_${Date.now()}@baldia.mart`,
          mpin: hashedMpin
        });
        isNew = true;
      } else {
        await this.ridersService.update(userOrRider.id, { mpin: hashedMpin });
      }
    }

    if (role === 'customer') {
      const authResponse = this.login(userOrRider as User);
      return { ...authResponse, isNewUser: isNew };
    } else {
      const authResponse = await this.loginRider(userOrRider as Rider);
      return { ...authResponse, isNewUser: isNew };
    }
  }
}
