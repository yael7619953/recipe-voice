import { Router } from 'express';
import { registerHandler, loginHandler, meHandler } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.get('/me', authMiddleware, meHandler);

export default router;
