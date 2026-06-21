import bcrypt from 'bcrypt';
import User from '../models/user.model.js';
import { signToken } from '../utils/jwt.js';
import { AppError } from '../middleware/error.middleware.js';

const SALT_ROUNDS = 12;

function normalizeEmail(email) {
  return email?.trim().toLowerCase() ?? '';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const exactMatch = await User.findOne({ email: normalizedEmail });
  if (exactMatch) {
    return exactMatch;
  }

  return User.findOne({
    email: { $regex: new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i') },
  });
}

function isLocalUser(user) {
  return (user.provider ?? 'local') === 'local';
}

export async function register({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);
  if (!name?.trim() || !normalizedEmail || !password) {
    throw new AppError('Name, email, and password are required', 400);
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password: hashed,
    provider: 'local',
  });

  const token = signToken({ userId: user._id });
  return { token, user: { id: user._id, name: user.name, email: user.email } };
}

export async function login({ email, password }) {
  if (!normalizeEmail(email) || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await findUserByEmail(email);
  if (!user || !isLocalUser(user) || !user.password) {
    throw new AppError('Invalid credentials', 401);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = signToken({ userId: user._id });
  return { token, user: { id: user._id, name: user.name, email: user.email } };
}

export async function getMe(userId) {
  const user = await User.findById(userId).select('name email').lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return { id: user._id, name: user.name, email: user.email };
}
