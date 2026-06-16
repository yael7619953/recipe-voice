import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  listHandler,
  getByIdHandler,
  createHandler,
  updateHandler,
  deleteHandler,
} from '../controllers/category.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', listHandler);
router.get('/:id', getByIdHandler);
router.post('/', createHandler);
router.put('/:id', updateHandler);
router.delete('/:id', deleteHandler);

export default router;
