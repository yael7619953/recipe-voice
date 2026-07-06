import * as recipeService from './recipe.service.js';
import * as categoryService from './category.service.js';
import * as aiService from './ai.service.js';

// Gemini function-declaration format
export const toolDeclarations = [
  {
    name: 'searchRecipes',
    description: 'Search/list the user recipes, optionally filtered by free text, category id, or favorite flag',
    parameters: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Free-text search in the title' },
        category: { type: 'string', description: 'Category id to filter by' },
        favorite: { type: 'boolean' },
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
    name: 'toggleFavorite',
    description: 'Mark or unmark a recipe as favorite',
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
  {
    name: 'listCategories',
    description: 'List all categories for the user, optionally as a tree',
    parameters: {
      type: 'object',
      properties: { tree: { type: 'boolean' } },
    },
  },
  {
    name: 'createCategory',
    description: 'Create a new category',
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
];

/**
 * Executes a tool by name against the real services.
 * userId is injected here — never trusted from the LLM's function-call arguments.
 */
export async function executeTool(name, args, userId) {
  switch (name) {
    case 'searchRecipes':
      return recipeService.listByUser(userId, args);
    case 'getRecipeDetails':
      return recipeService.getById(userId, args.id);
    case 'toggleFavorite':
      return recipeService.patch(userId, args.id, { isFavorite: args.isFavorite });
    case 'deleteRecipe':
      await recipeService.deleteById(userId, args.id);
      return { deleted: true };
    case 'listCategories':
      return categoryService.listByUser(userId, args);
    case 'createCategory':
      return categoryService.create(userId, args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

/**
 * Special-cased: extracting a recipe from an uploaded file is a two-step
 * flow (extract → create) because aiService.extractRecipeFromFile does NOT
 * persist anything. Kept separate from executeTool so agent.service.js can
 * run it deterministically before the LLM even sees the message.
 */
export async function extractAndCreateRecipeFromFile(userId, filePath, mimeType, originalName) {
  const extracted = await aiService.extractRecipeFromFile(filePath, mimeType, originalName);
  return recipeService.create(userId, { ...extracted, isFavorite: false });
}