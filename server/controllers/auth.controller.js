import * as authService from '../services/auth.service.js';
import { signToken } from '../utils/jwt.js';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';

export async function meHandler(req, res, next) {
  try {
    const user = await authService.getMe(req.userId);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

export async function registerHandler(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export function googleCallbackHandler(req, res) {
  const token = signToken({ userId: req.user._id });
  const redirectUrl = `${CLIENT_URL}/auth/oauth-callback?token=${encodeURIComponent(token)}`;
  res.redirect(redirectUrl);
}
