import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  googleCallbackHandler,
  meHandler,
} from '../controllers/auth.controller.js';
import passport from '../config/passport.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';
const OAUTH_FAILURE_REDIRECT = `${CLIENT_URL}/auth/login?error=oauth_failed`;

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: OAUTH_FAILURE_REDIRECT }),
  googleCallbackHandler,
);

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.get('/me', authMiddleware, meHandler);

export default router;
