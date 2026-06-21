import fs from 'fs/promises';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/error.middleware.js';
import * as aiService from '../services/ai.service.js';

export const extractHandler = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file received', 400);
  }

  const { path: filePath, mimetype, originalname } = req.file;

  try {
    const recipe = await aiService.extractRecipeFromFile(filePath, mimetype, originalname);
    res.json({ success: true, data: recipe });
  } finally {
    // Always remove the temp file regardless of success or failure
    await fs.unlink(filePath).catch(() => {});
  }
});
