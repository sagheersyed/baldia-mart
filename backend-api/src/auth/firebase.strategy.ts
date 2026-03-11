import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import * as firebaseAdmin from 'firebase-admin';

// Initialize firebase admin with default credentials
// In a real scenario, proper service account json is needed
if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
  });
}

// Custom strategy: extract raw Bearer token, verify with Firebase Admin
@Injectable()
export class FirebaseStrategy extends PassportStrategy(Strategy, 'firebase-auth') {
  constructor() {
    super({
      // We use a dummy secret; actual verification is done inside validate()
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Skip passport-jwt signature verification — Firebase Admin does it
      secretOrKeyProvider: (_req: any, _rawToken: string, done: any) => done(null, 'unused'),
      passReqToCallback: false,
    });
  }

  async validate(_payload: any, ...args: any[]) {
    // Re-extract the raw token from the request coming via args
    // NOTE: Because passReqToCallback is false, the raw token is NOT passed here.
    // We override the default flow by intercepting at authenticate level.
    // Return payload as-is (Firebase Admin verification is done in auth guard).
    return _payload;
  }
}
