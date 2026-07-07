import { chat } from '../services/agent.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const postChat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;
  const parsedHistory = history ? JSON.parse(history) : [];

  const result = await chat({
    userId: req.userId,
    message,
    history: parsedHistory,
    file: req.file, // present only if a file was attached (multer)
  });

  res.json(result);
});