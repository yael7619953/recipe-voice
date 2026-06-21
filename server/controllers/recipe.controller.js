import { asyncHandler } from '../utils/asyncHandler.js';
import * as recipeService from '../services/recipe.service.js';
import { AppError } from '../middleware/error.middleware.js';

export const listHandler = asyncHandler(async (req, res) => {
  const data = await recipeService.listByUser(req.userId, req.validatedQuery);
  res.json(data);
});

export const getByIdHandler = asyncHandler(async (req, res) => {
  const recipe = await recipeService.getById(req.userId, req.params.id);
  res.json(recipe);
});

export const createHandler = asyncHandler(async (req, res) => {
  const recipe = await recipeService.create(req.userId, req.body);
  res.status(201).json(recipe);
});

export const replaceHandler = asyncHandler(async (req, res) => {
  const recipe = await recipeService.replace(req.userId, req.params.id, req.body);
  res.json(recipe);
});

export const patchHandler = asyncHandler(async (req, res) => {
  const recipe = await recipeService.patch(req.userId, req.params.id, req.body);
  res.json(recipe);
});

export const deleteHandler = asyncHandler(async (req, res) => {
  await recipeService.deleteById(req.userId, req.params.id);
  res.status(204).send();
});

export const uploadImageHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No image file received', 400);
  const imageUrl = `/uploads/${req.file.filename}`;
  const recipe = await recipeService.patch(req.userId, req.params.id, { imageUrl });
  res.json(recipe);
});
