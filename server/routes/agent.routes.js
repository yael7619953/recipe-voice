import { Router } from 'express';
import { postChat } from '../controllers/agent.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

// reuse the same multer instance already configured for /api/ai uploads
router.post('/chat', requireAuth, upload.single('file'), postChat);

export default router;