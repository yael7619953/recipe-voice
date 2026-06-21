import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/error.middleware.js';

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '7d';

function assertSecretConfigured() {
  if (!SECRET) {
    throw new AppError('JWT_SECRET is not configured', 500);
  }
}

export function signToken(payload) {
  assertSecretConfigured();
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  assertSecretConfigured();
  return jwt.verify(token, SECRET);
}
