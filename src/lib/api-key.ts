import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export function hash(key: string): Promise<string> {
  return bcrypt.hash(key, SALT_ROUNDS);
}

export function verify(key: string, hashStr: string): Promise<boolean> {
  return bcrypt.compare(key, hashStr);
}
