import express from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import recipeRoutes from './recipe.routes.js';
import aiRoutes from './ai.routes.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/recipes', recipeRoutes);
router.use('/ai', aiRoutes);
// router.use('/voice', voiceRoutes);

export default router;
