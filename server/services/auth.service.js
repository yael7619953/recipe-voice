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
  // Allow password login for any account that has a password set,
  // regardless of provider (a local user may also have linked Google).
  if (!user || !user.password) {
    throw new AppError('Invalid credentials', 401);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = signToken({ userId: user._id });
  return { token, user: { id: user._id, name: user.name, email: user.email } };
}

export async function findOrCreateGoogleUser(profile) {
  const email = profile.emails?.[0]?.value?.toLowerCase();
  if (!email) {
    throw new AppError('Google account email is required', 400);
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: profile.displayName || email.split('@')[0],
      email,
      googleId: profile.id,
      provider: 'google',
    });
  } else if (!user.googleId) {
    // Link Google to an existing account without overwriting its original provider,
    // so password login keeps working alongside Google sign-in.
    user.googleId = profile.id;
    await user.save();
  }

  return user;
}
