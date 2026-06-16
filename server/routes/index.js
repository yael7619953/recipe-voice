import express from 'express';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'API is healthy' });
});

// router.use('/auth', authRoutes);
// router.use('/categories', categoryRoutes);
// router.use('/recipes', recipeRoutes);
// router.use('/voice', voiceRoutes);
// router.use('/ai', aiRoutes);

export default router;
