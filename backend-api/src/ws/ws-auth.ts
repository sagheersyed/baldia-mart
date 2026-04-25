import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { getJwtSecretOrThrow } from '../auth/jwt-secret';

export type WsPrincipal = {
  id: string;
  role?: string;
};

export function resolveSocketToken(client: Socket): string | null {
  const authToken = client.handshake?.auth?.token;
  const headerToken = client.handshake?.headers?.authorization;
  const rawToken =
    typeof authToken === 'string' && authToken
      ? authToken
      : typeof headerToken === 'string'
        ? headerToken
        : '';

  if (!rawToken) return null;
  return rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
}

export function authenticateSocket(client: Socket): WsPrincipal {
  const token = resolveSocketToken(client);
  if (!token) throw new Error('Missing socket token');

  const payload = jwt.verify(token, getJwtSecretOrThrow()) as any;
  const sub = payload?.sub;
  if (!sub) throw new Error('Invalid token payload');
  return { id: String(sub), role: payload?.role ? String(payload.role) : undefined };
}

