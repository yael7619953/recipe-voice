import * as recipeService from './recipe.service.js';
import * as categoryService from './category.service.js';
import * as aiService from './ai.service.js';

export const toolDeclarations = [
  // ---------- Recipes ----------
  {
    name: 'searchRecipes',
    description: 'Search/list the user recipes, optionally filtered by free text, category id, or favorite flag. Supports pagination.',
    parameters: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Free-text search in the title' },
        category: { type: 'string', description: 'Category id to filter by (includes its sub-categories)' },
        favorite: { type: 'boolean' },
        page: { type: 'number', description: 'Page number, starting at 1' },
        limit: { type: 'number', description: 'Items per page (max 20)' },
      },
    },
  },
  {
    name: 'getRecipeDetails',
    description: 'Get full details of a single recipe by id',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'createRecipe',
    description: 'Create a brand-new recipe from scratch (not from an uploaded file)',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of ingredient lines, e.g. "2 cups flour"',
        },
        instructions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ordered list of preparation steps',
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Category ids to attach the recipe to',
        },
        prepTime: { type: 'number', description: 'Preparation time in minutes' },
        servings: { type: 'number' },
        notes: { type: 'string' },
        isFavorite: { type: 'boolean' },
        imageUrl: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'updateRecipe',
    description: 'Update one or more fields of an existing recipe (partial update — only send the fields that changed, e.g. title, ingredients, categories, prepTime, isFavorite, etc.)',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        ingredients: { type: 'array', items: { type: 'string' } },
        instructions: { type: 'array', items: { type: 'string' } },
        categories: { type: 'array', items: { type: 'string' } },
        prepTime: { type: 'number' },
        servings: { type: 'number' },
        notes: { type: 'string' },
        isFavorite: { type: 'boolean' },
        imageUrl: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'toggleFavorite',
    description: 'Mark or unmark a recipe as favorite (shortcut for updateRecipe with just isFavorite)',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' }, isFavorite: { type: 'boolean' } },
      required: ['id', 'isFavorite'],
    },
  },
  {
    name: 'deleteRecipe',
    description: 'Delete a recipe by id',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },

  // ---------- Categories ----------
  {
    name: 'listCategories',
    description: 'List all categories for the user, optionally as a nested tree',
    parameters: {
      type: 'object',
      properties: { tree: { type: 'boolean' } },
    },
  },
  {
    name: 'getCategoryDetails',
    description: 'Get details of a single category by id',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'createCategory',
    description: 'Create a new category, optionally nested under a parent category',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        color: { type: 'string' },
        icon: { type: 'string' },
        parentCategory: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'updateCategory',
    description: 'Update an existing category (name, color, icon, or move it under a different parent)',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        color: { type: 'string' },
        icon: { type: 'string' },
        parentCategory: { type: 'string', description: 'New parent category id, or omit to make it a root category' },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'deleteCategory',
    description: 'Delete a category by id. Fails if it has child categories or linked recipes.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
];

export async function executeTool(name, args, userId) {
  switch (name) {
    // ---------- Recipes ----------
    case 'searchRecipes':
      return recipeService.listByUser(userId, args);
    case 'getRecipeDetails':
      return recipeService.getById(userId, args.id);
    case 'createRecipe':
      return recipeService.create(userId, args);
    case 'updateRecipe':
      return recipeService.patch(userId, args.id, args);
    case 'toggleFavorite':
      return recipeService.patch(userId, args.id, { isFavorite: args.isFavorite });
    case 'deleteRecipe':
      await recipeService.deleteById(userId, args.id);
      return { deleted: true };

    // ---------- Categories ----------
    case 'listCategories':
      return categoryService.listByUser(userId, args);
    case 'getCategoryDetails':
      return categoryService.getById(userId, args.id);
    case 'createCategory':
      return categoryService.create(userId, args);
    case 'updateCategory':
      return categoryService.update(userId, args.id, args);
    case 'deleteCategory':
      await categoryService.deleteById(userId, args.id);
      return { deleted: true };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function extractAndCreateRecipeFromFile(userId, filePath, mimeType, originalName) {
  const extracted = await aiService.extractRecipeFromFile(filePath, mimeType, originalName);
  return recipeService.create(userId, { ...extracted, isFavorite: false });
}