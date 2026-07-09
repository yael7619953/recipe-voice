import * as recipeService from './recipe.service.js';
import * as categoryService from './category.service.js';
import * as aiService from './ai.service.js';
import { AppError } from '../middleware/error.middleware.js';

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
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'The instruction step text' },
              timer: {
                type: 'object',
                properties: {
                  duration: { type: 'number', description: 'Timer duration in minutes (0 if none)' },
                  hasTimer: { type: 'boolean', description: 'True when this step needs a cooking timer' },
                },
              },
            },
            required: ['text'],
          },
          description: 'Ordered list of preparation steps, each with its own text and optional timer',
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Category ids to attach the recipe to',
        },
        prepTime: {
          type: 'object',
          properties: {
            hours: { type: 'number' },
            minutes: { type: 'number' },
          },
          description: 'Preparation time split into hours and minutes',
        },
        servings: { type: 'string', description: 'Number of servings, e.g. "4" or "4-6"' },
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
        instructions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'The instruction step text' },
              timer: {
                type: 'object',
                properties: {
                  duration: { type: 'number', description: 'Timer duration in minutes (0 if none)' },
                  hasTimer: { type: 'boolean', description: 'True when this step needs a cooking timer' },
                },
              },
            },
            required: ['text'],
          },
        },
        categories: { type: 'array', items: { type: 'string' } },
        prepTime: {
          type: 'object',
          properties: {
            hours: { type: 'number' },
            minutes: { type: 'number' },
          },
        },
        servings: { type: 'string', description: 'Number of servings, e.g. "4" or "4-6"' },
        notes: { type: 'string' },
        isFavorite: { type: 'boolean' },
        imageUrl: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'attachRecipeImage',
    description:
      'Set the image attached to the current user message as the cover photo of an existing recipe. ' +
      'Only works when this turn includes an uploaded image file. ' +
      'If you only know the recipe by name, call searchRecipes first to get its id. ' +
      'If several recipes match, ask the user which one. Do not use this for PDF or Word files.',
    parameters: {
      type: 'object',
      properties: {
        recipeId: { type: 'string', description: 'Id of the recipe that should get this cover image' },
      },
      required: ['recipeId'],
    },
  },
  {
    name: 'extractRecipeFromFile',
    description:
      'Extract a structured recipe from the file attached to the current user message (PDF, Word .docx, or image of a recipe) ' +
      'and save it as a new recipe. Only call when the user clearly wants to import/save a recipe from the file ' +
      'and the file content looks like a recipe. Do not call for unrelated files or for food photos meant only as a cover image ' +
      '(use attachRecipeImage for that). Requires a file on this turn. Takes no arguments.',
    parameters: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm extraction from the attached file',
        },
      },
      required: ['confirm'],
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

/**
 * Some LLMs drift from the declared tool schema (e.g. send a plain instruction
 * string instead of { text, timer }, or prepTime as a single number of minutes).
 * Normalize those shapes here so a minor deviation doesn't surface as a raw
 * Mongoose "Validation failed" error to the user.
 */
function normalizeInstructions(instructions) {
  if (!Array.isArray(instructions)) return instructions;
  return instructions.map((step) => {
    if (typeof step === 'string') {
      return { text: step, timer: { duration: 0, hasTimer: false } };
    }
    return {
      text: step?.text ?? '',
      timer: {
        duration: step?.timer?.duration ?? 0,
        hasTimer: step?.timer?.hasTimer ?? false,
      },
    };
  });
}

function normalizePrepTime(prepTime) {
  if (typeof prepTime === 'number') {
    return { hours: Math.floor(prepTime / 60), minutes: prepTime % 60 };
  }
  if (prepTime && typeof prepTime === 'object') {
    return { hours: prepTime.hours ?? 0, minutes: prepTime.minutes ?? 0 };
  }
  return prepTime;
}

function normalizeRecipeArgs(args) {
  const normalized = { ...args };
  if ('instructions' in normalized) {
    normalized.instructions = normalizeInstructions(normalized.instructions);
  }
  if ('prepTime' in normalized) {
    normalized.prepTime = normalizePrepTime(normalized.prepTime);
  }
  if (typeof normalized.servings === 'number') {
    normalized.servings = String(normalized.servings);
  }
  return normalized;
}

/**
 * @param {string} name
 * @param {object} args
 * @param {string} userId
 * @param {{ filename: string, mimetype: string, path?: string, originalname?: string } | null} [file]
 */
export async function executeTool(name, args, userId, file = null) {
  switch (name) {
    // ---------- Recipes ----------
    case 'searchRecipes':
      return recipeService.listByUser(userId, args);
    case 'getRecipeDetails':
      return recipeService.getById(userId, args.id);
    case 'createRecipe':
      return recipeService.create(userId, normalizeRecipeArgs(args));
    case 'updateRecipe':
      return recipeService.patch(userId, args.id, normalizeRecipeArgs(args));
    case 'attachRecipeImage': {
      if (!file) {
        throw new AppError('No file was attached to this message', 400);
      }
      if (!file.mimetype?.startsWith('image/')) {
        throw new AppError('Only image files can be set as a recipe cover', 400);
      }
      if (!args.recipeId) {
        throw new AppError('recipeId is required', 400);
      }
      const imageUrl = `/uploads/${file.filename}`;
      return recipeService.patch(userId, args.recipeId, { imageUrl });
    }
    case 'extractRecipeFromFile': {
      if (!file) {
        throw new AppError('No file was attached to this message', 400);
      }
      return extractAndCreateRecipeFromFile(
        userId,
        file.path,
        file.mimetype,
        file.originalname,
      );
    }
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
      throw new AppError(`Unknown tool: ${name}`, 400);
  }
}

export async function extractAndCreateRecipeFromFile(userId, filePath, mimeType, originalName) {
  const extracted = await aiService.extractRecipeFromFile(filePath, mimeType, originalName);
  return recipeService.create(userId, { ...extracted, isFavorite: false });
}
