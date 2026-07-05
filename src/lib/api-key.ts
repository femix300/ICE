import crypto from 'node:crypto';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export function generate(): string {
  const raw = crypto.randomBytes(32).toString('base64url');
  return `ice_${raw}`;
}

export function hash(key: string): Promise<string> {
  return bcrypt.hash(key, SALT_ROUNDS);
}

export function verify(key: string, hashStr: string): Promise<boolean> {
  return bcrypt.compare(key, hashStr);
}
