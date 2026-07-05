import { describe, it, expect, beforeAll } from 'vitest';

let signToken;
let verifyToken;

describe('jwt utils', () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    ({ signToken, verifyToken } = await import('../utils/jwt.js'));
  });

  it('signs and verifies a payload round-trip', () => {
    const token = signToken({ userId: 'abc123' });
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe('abc123');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it('rejects a tampered token', () => {
    const token = signToken({ userId: 'abc123' });
    expect(() => verifyToken(`${token}tampered`)).toThrow();
  });
});
