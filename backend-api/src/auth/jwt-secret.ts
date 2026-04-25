export function getJwtSecretOrThrow(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('JWT_SECRET is required but was not set');
  }
  return secret;
}

