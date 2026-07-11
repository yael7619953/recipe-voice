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
      '(use attachRecipeImage for that). Requires a file on this turn. ' +
      'If the user also wants this recipe placed in a specific category, resolve its id (via listCategories/getCategoryDetails) and pass it in ' +
      'the "categories" argument of this SAME call — do not use createRecipe for a file import, since createRecipe cannot read the file ' +
      'and would force you to either invent content or leave the recipe empty.',
    parameters: {
      type: 'object',
      properties: {
        confirm: {
          type: 'boolean',
          description: 'Must be true to confirm extraction from the attached file',
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Category ids to attach the extracted recipe to, resolved from the names the user mentioned (if any)',
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
    description:
      'Create a new category, optionally nested under a parent category. ' +
      'color and icon are optional — if the user did not specify them, omit these arguments entirely ' +
      'and let the server apply sensible defaults. Do not ask the user to choose a color or icon unless they want to customize it themselves.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        color: {
          type: 'string',
          description:
            'Optional — omit to use the default category color. When provided, must be a hex color code in "#RRGGBB" format (e.g. "#e53935" for red). ' +
            'If the user names a color in words (e.g. "orange", "כתום"), pick a well-known hex value for that color yourself — never pass the color name as text.',
        },
        icon: {
          type: 'string',
          description:
            'Optional — omit to use the default category icon. When provided, must be a single emoji character that visually represents the category (e.g. "🍕" for pizza, "🍰" for desserts). ' +
            'Never pass an icon library name, a CSS class, or a plain-text word — always an actual emoji glyph.',
        },
        parentCategory: { type: 'string', description: 'Parent category id, or omit to create it as a root category' },
      },
      required: ['name'],
    },
  },
  {
    name: 'updateCategory',
    description:
      'Partially update an existing category — only send the fields that should change (e.g. just color, or just icon). ' +
      'Fields you omit are left untouched.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string', description: 'Omit to keep the current name' },
        color: {
          type: 'string',
          description:
            'Hex color code in "#RRGGBB" format (e.g. "#e53935" for red). Omit to keep the current color. ' +
            'If the user names a color in words (e.g. "orange", "כתום"), pick a well-known hex value for that color yourself — never pass the color name as text.',
        },
        icon: {
          type: 'string',
          description:
            'A single emoji character that visually represents the category (e.g. "🍕" for pizza, "🍰" for desserts). Omit to keep the current icon. ' +
            'Never pass an icon library name, a CSS class, or a plain-text word — always an actual emoji glyph.',
        },
        parentCategory: {
          type: 'string',
          description:
            'New parent category id to move it under. Omit to leave its current parent unchanged. Pass an empty string to detach it and make it a root category.',
        },
      },
      required: ['id'],
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

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
// Real emoji glyphs live outside the printable-ASCII range; an all-printable-ASCII
// string means the model sent a word/icon-name (e.g. "cake") instead of an actual emoji character.
const ASCII_ONLY_RE = /^[\x20-\x7E]+$/;

/**
 * Category color/icon have no free-text meaning of their own — the model only
 * learns their format from the tool description, so validate here and hand
 * back a clear error it can react to instead of saving a bad value silently.
 */
function normalizeCategoryArgs(args) {
  const normalized = { ...args };

  if ('color' in normalized && normalized.color != null) {
    const color = String(normalized.color).trim();
    if (!HEX_COLOR_RE.test(color)) {
      throw new AppError(
        `Invalid color "${normalized.color}": must be a hex code like "#e53935", not a color name.`,
        400,
      );
    }
    normalized.color = color;
  }

  if ('icon' in normalized && normalized.icon != null) {
    const icon = String(normalized.icon).trim();
    if (!icon || ASCII_ONLY_RE.test(icon)) {
      throw new AppError(
        `Invalid icon "${normalized.icon}": must be a single emoji character (e.g. "🍕"), not an icon name or text.`,
        400,
      );
    }
    normalized.icon = icon;
  }

  if (normalized.parentCategory === '') {
    normalized.parentCategory = null;
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
        args.categories,
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
      return categoryService.create(userId, normalizeCategoryArgs(args));
    case 'updateCategory':
      return categoryService.update(userId, args.id, normalizeCategoryArgs(args));
    case 'deleteCategory':
      await categoryService.deleteById(userId, args.id);
      return { deleted: true };

    default:
      throw new AppError(`Unknown tool: ${name}`, 400);
  }
}

export async function extractAndCreateRecipeFromFile(
  userId,
  filePath,
  mimeType,
  originalName,
  categories,
) {
  const extracted = await aiService.extractRecipeFromFile(filePath, mimeType, originalName);
  return recipeService.create(userId, {
    ...extracted,
    categories: categories?.length ? categories : extracted.categories,
    isFavorite: false,
  });
}
