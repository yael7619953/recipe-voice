import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { uploadAiMedia } from '../middleware/upload.middleware.js';
import { extractHandler } from '../controllers/ai.controller.js';

const router = Router();

router.post('/extract', authMiddleware, uploadAiMedia, extractHandler);

export default router;
