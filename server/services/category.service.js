import Category from '../models/category.model.js';
import Recipe from '../models/recipe.model.js';
import { AppError } from '../middleware/error.middleware.js';

async function findOwnedCategory(userId, id) {
  const category = await Category.findOne({ userId, _id: id });
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  return category;
}

async function validateParentCategory(userId, parentCategoryId) {
  if (parentCategoryId == null) {
    return;
  }

  const parent = await Category.findOne({ userId, _id: parentCategoryId });
  if (!parent) {
    throw new AppError('Parent category not found', 404);
  }
}

async function assertNoCircularRef(userId, categoryId, newParentId) {
  if (newParentId == null) {
    return;
  }

  if (String(newParentId) === String(categoryId)) {
    throw new AppError('Category cannot be its own parent', 400);
  }

  let current = newParentId;
  while (current) {
    if (String(current) === String(categoryId)) {
      throw new AppError('Circular category hierarchy', 400);
    }

    const ancestor = await Category.findOne({ userId, _id: current })
      .select('parentCategory')
      .lean();
    if (!ancestor) {
      break;
    }
    current = ancestor.parentCategory;
  }
}

function buildTree(categories) {
  const byId = new Map();

  for (const category of categories) {
    byId.set(String(category._id), { ...category, children: [] });
  }

  const roots = [];

  for (const category of categories) {
    const node = byId.get(String(category._id));
    if (category.parentCategory) {
      const parent = byId.get(String(category.parentCategory));
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function listByUser(userId, { tree = false } = {}) {
  const categories = await Category.find({ userId }).lean();

  if (tree) {
    return buildTree(categories);
  }

  return categories;
}

export async function getById(userId, id) {
  return findOwnedCategory(userId, id);
}

export async function create(userId, data) {
  const { name, color, icon, parentCategory = null } = data;

  await validateParentCategory(userId, parentCategory);

  return Category.create({ name, color, icon, userId, parentCategory });
}

export async function update(userId, id, data) {
  const existing = await findOwnedCategory(userId, id);

  // Partial update: a field that isn't sent keeps its current value instead
  // of being reset (e.g. omitting parentCategory must not detach the category).
  const name = 'name' in data ? data.name : existing.name;
  const color = 'color' in data ? data.color : existing.color;
  const icon = 'icon' in data ? data.icon : existing.icon;
  const parentCategory =
    'parentCategory' in data ? data.parentCategory || null : existing.parentCategory;

  await validateParentCategory(userId, parentCategory);
  await assertNoCircularRef(userId, id, parentCategory);

  const category = await Category.findOneAndUpdate(
    { userId, _id: id },
    { name, color, icon, parentCategory },
    { new: true, runValidators: true }
  );

  return category;
}

export async function deleteById(userId, id) {
  await findOwnedCategory(userId, id);

  const childCount = await Category.countDocuments({ userId, parentCategory: id });
  if (childCount > 0) {
    throw new AppError('Category has child categories', 409);
  }

  const recipeCount = await Recipe.countDocuments({ userId, categories: id });
  if (recipeCount > 0) {
    throw new AppError('Category has linked recipes', 409);
  }

  await Category.deleteOne({ userId, _id: id });
}
