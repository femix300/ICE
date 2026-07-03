import { describe, it, expect } from 'vitest';
import { hash, verify } from '../../src/lib/api-key.js';

describe('API Key utilities', () => {
  it('should hash and verify a key correctly', async () => {
    const key = 'test-secret-key';
    const hashed = await hash(key);
    expect(hashed).not.toBe(key);
    const isValid = await verify(key, hashed);
    expect(isValid).toBe(true);
  });

  it('should return false for incorrect key', async () => {
    const key = 'test-secret-key';
    const hashed = await hash(key);
    const isValid = await verify('wrong-key', hashed);
    expect(isValid).toBe(false);
  });
});
