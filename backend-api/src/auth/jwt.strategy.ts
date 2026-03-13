import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { RidersService } from '../riders/riders.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private usersService: UsersService,
    private ridersService: RidersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super_secret_jwt_key',
    });
  }

  async validate(payload: any) {
    if (payload.role === 'rider') {
      const rider = await this.ridersService.findById(payload.sub);
      if (!rider) throw new UnauthorizedException('Rider record not found');
      return { ...rider, role: 'rider' };
    }

    try {
      const user = await this.usersService.findById(payload.sub);
      return user;
    } catch (e) {
      throw new UnauthorizedException('User record not found');
    }
  }
}
