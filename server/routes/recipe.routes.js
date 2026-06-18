import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import {
  createSchema,
  idSchema,
  listQuerySchema,
  patchSchema,
  replaceSchema,
} from '../validators/recipe.validator.js';
import {
  listHandler,
  getByIdHandler,
  createHandler,
  replaceHandler,
  patchHandler,
  deleteHandler,
} from '../controllers/recipe.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', validateQuery(listQuerySchema), listHandler);
router.get('/:id', validateParams(idSchema), getByIdHandler);
router.post('/', validateBody(createSchema), createHandler);
router.put('/:id', validateParams(idSchema), validateBody(replaceSchema), replaceHandler);
router.patch('/:id', validateParams(idSchema), validateBody(patchSchema), patchHandler);
router.delete('/:id', validateParams(idSchema), deleteHandler);

export default router;
