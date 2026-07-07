import { Router } from 'express';
import { postChat } from '../controllers/agent.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { uploadAiMedia  } from '../middleware/upload.middleware.js';

const router = Router();

// reuse the same multer instance already configured for /api/ai uploads
router.post('/chat', authMiddleware, uploadAiMedia, postChat);

export default router;