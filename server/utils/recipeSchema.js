/**

 * JSON Schema for Gemini structured output.

 * Mirrors the recipe Mongoose model so the LLM returns data

 * that can be saved directly (after adding userId on the server).

 */

export const recipeJsonSchema = {

  type: 'object',

  propertyOrdering: ['title', 'description', 'ingredients', 'instructions', 'prepTime', 'servings', 'notes'],

  properties: {

    title: { type: 'string', description: 'Recipe title' },

    description: {

      type: 'string',

      nullable: true,

      description: 'Short description of the dish, or null if not provided',

    },

    ingredients: {

      type: 'array',

      items: { type: 'string' },

      description: 'List of ingredients with quantities',

    },

    instructions: {

      type: 'array',

      items: {

        type: 'object',

        propertyOrdering: ['text', 'timer'],

        properties: {

          text: { type: 'string', description: 'Step instructions' },

          timer: {

            type: 'object',

            propertyOrdering: ['duration', 'hasTimer'],

            properties: {

              duration: { type: 'number', description: 'Timer duration in minutes (0 if none)' },

              hasTimer: { type: 'boolean', description: 'True when a cooking timer is needed' },

            },

            required: ['duration', 'hasTimer'],

          },

        },

        required: ['text', 'timer'],

      },

      description: 'Ordered list of cooking steps',

    },

    prepTime: {

      type: 'object',

      propertyOrdering: ['hours', 'minutes'],

      properties: {

        hours: { type: 'number', description: 'Preparation hours' },

        minutes: { type: 'number', description: 'Preparation minutes' },

      },

      required: ['hours', 'minutes'],

    },

    servings: { type: 'string', description: 'Number of servings, e.g. "4" or "4-6"' },

    notes: {

      type: 'string',

      nullable: true,

      description: 'Optional extra notes or tips, or null if not provided',

    },

  },

  required: ['title', 'description', 'ingredients', 'instructions', 'prepTime', 'servings', 'notes'],

};

