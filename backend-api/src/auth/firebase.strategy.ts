import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import * as firebaseAdmin from 'firebase-admin';

if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'demo-project',
  });
}

@Injectable()
export class FirebaseStrategy extends PassportStrategy(Strategy, 'firebase-auth') {
  constructor() {
    super();
  }

  async validate(token: string) {
    // Local development mock token handling
    if (token.startsWith('fake-token-for-')) {
      const phone = token.replace('fake-token-for-', '');
      return { uid: `mock-phone-${phone}`, name: `Mock Phone User`, phone_number: phone };
    }
    if (token === 'fake-google-token') {
      return { uid: 'mock-google', email: 'mock@google.com', name: 'Mock Google User' };
    }

    // Production Firebase token verification
    try {
       const decoded = await firebaseAdmin.auth().verifyIdToken(token);
       return decoded;
    } catch (err) {
       throw new UnauthorizedException('Invalid token');
    }
  }
}
