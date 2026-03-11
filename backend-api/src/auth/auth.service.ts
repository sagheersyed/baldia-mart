import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateFirebaseUser(firebaseUser: any): Promise<User> {
    const { uid, email, name, picture } = firebaseUser;
    let user = await this.usersService.findByFirebaseUid(uid);
    
    if (!user) {
      // Auto-register via Firebase data from OAuth
      user = await this.usersService.create({
        firebaseUid: uid,
        email: email || `${uid}@placeholder.email`, // Fallback for phone-auth
        name: name || 'Valued Customer',
      });
    }

    return user;
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
}
