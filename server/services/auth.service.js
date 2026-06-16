import bcrypt from 'bcrypt';
import User from '../models/user.model.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../middleware/error.middleware.js';

const SALT_ROUNDS = 12;

export async function register({ name, email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, password: hashed, provider: 'local' });

  const token = signToken({ userId: user._id });
  return { token, user: { id: user._id, name: user.name, email: user.email } };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user || user.provider !== 'local') {
    throw new AppError('Invalid credentials', 401);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = signToken({ userId: user._id });
  return { token, user: { id: user._id, name: user.name, email: user.email } };
}
