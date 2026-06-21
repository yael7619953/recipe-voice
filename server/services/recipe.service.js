import Category from '../models/category.model.js';
import Recipe from '../models/recipe.model.js';
import { AppError } from '../middleware/error.middleware.js';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;

const PATCHABLE_FIELDS = [
  'title',
  'description',
  'ingredients',
  'instructions',
  'categories',
  'prepTime',
  'servings',
  'notes',
  'isFavorite',
  'imageUrl',
];

async function findOwnedRecipe(userId, id) {
  const recipe = await Recipe.findOne({ userId, _id: id });
  if (!recipe) {
    throw new AppError('Recipe not found', 404);
  }
  return recipe;
}

async function validateCategories(userId, categoryIds) {
  if (!categoryIds?.length) {
    return;
  }

  const count = await Category.countDocuments({
    userId,
    _id: { $in: categoryIds },
  });

  if (count !== categoryIds.length) {
    throw new AppError('One or more categories not found', 404);
  }
}

function buildListFilter(userId, { category, favorite, q } = {}) {
  const filter = { userId };

  if (category) {
    filter.categories = category;
  }

  if (favorite === true || favorite === 'true') {
    filter.isFavorite = true;
  }

  if (q?.trim()) {
    filter.title = { $regex: q.trim(), $options: 'i' };
  }

  return filter;
}

function parsePagination(query) {
  let page = Number.parseInt(query.page, 10);
  let limit = Number.parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) {
    page = DEFAULT_PAGE;
  }
  if (!Number.isFinite(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }
  if (limit > MAX_LIMIT) {
    limit = MAX_LIMIT;
  }

  return { page, limit, skip: (page - 1) * limit };
}

function extractRecipeFields(data, { isFavoriteDefault = false } = {}) {
  const {
    title,
    description,
    ingredients,
    instructions,
    categories = [],
    prepTime,
    servings,
    notes,
    isFavorite = isFavoriteDefault,
    imageUrl,
  } = data;

  return {
    title,
    description,
    ingredients,
    instructions,
    categories,
    prepTime,
    servings,
    notes,
    isFavorite,
    imageUrl,
  };
}

function pickPatchFields(data) {
  const update = {};

  for (const field of PATCHABLE_FIELDS) {
    if (Object.hasOwn(data, field)) {
      update[field] = data[field];
    }
  }

  return update;
}

export async function listByUser(userId, query = {}) {
  const filter = buildListFilter(userId, query);
  const { page, limit, skip } = parsePagination(query);

  const [items, total] = await Promise.all([
    Recipe.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Recipe.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

export async function getById(userId, id) {
  return findOwnedRecipe(userId, id);
}

export async function create(userId, data) {
  const fields = extractRecipeFields(data);

  await validateCategories(userId, fields.categories);

  return Recipe.create({ ...fields, userId });
}

export async function replace(userId, id, data) {
  const fields = extractRecipeFields(data);

  await validateCategories(userId, fields.categories);

  const recipe = await Recipe.findOneAndUpdate({ userId, _id: id }, fields, {
    new: true,
    runValidators: true,
  });

  if (!recipe) {
    throw new AppError('Recipe not found', 404);
  }

  return recipe;
}

export async function patch(userId, id, data) {
  const update = pickPatchFields(data);

  if (Object.keys(update).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  if (update.categories?.length) {
    await validateCategories(userId, update.categories);
  }

  const recipe = await Recipe.findOneAndUpdate({ userId, _id: id }, update, {
    new: true,
    runValidators: true,
  });

  if (!recipe) {
    throw new AppError('Recipe not found', 404);
  }

  return recipe;
}

export async function deleteById(userId, id) {
  const result = await Recipe.deleteOne({ userId, _id: id });

  if (result.deletedCount === 0) {
    throw new AppError('Recipe not found', 404);
  }
}
