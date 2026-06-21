import Joi from 'joi';
import mongoose from 'mongoose';

function isValidObjectId(value) {
  return (
    typeof value === 'string' &&
    mongoose.Types.ObjectId.isValid(value) &&
    String(new mongoose.Types.ObjectId(value)) === value
  );
}

const objectId = Joi.string().custom((value, helpers) => {
  if (!isValidObjectId(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'MongoDB ObjectId');

const timerSchema = Joi.object({
  hasTimer: Joi.boolean().default(false),
  duration: Joi.number().min(0).default(0),
}).default({ hasTimer: false, duration: 0 });

const instructionSchema = Joi.object({
  text: Joi.string().trim().min(1).required(),
  timer: timerSchema,
});

const recipeSchema = Joi.object({
  title: Joi.string().trim().min(1).required(),
  description: Joi.string().allow('', null).optional(),
  ingredients: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  instructions: Joi.array().items(instructionSchema).min(1).required(),
  categories: Joi.array().items(objectId).default([]),
  prepTime: Joi.object({
    hours: Joi.number().min(0).default(0),
    minutes: Joi.number().min(0).default(0),
  }).default({ hours: 0, minutes: 0 }),
  servings: Joi.string().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
  isFavorite: Joi.boolean().default(false),
  imageUrl: Joi.string().allow('', null).optional(),
});

export const createSchema = recipeSchema;
export const replaceSchema = recipeSchema;

export const patchSchema = Joi.object({
  title: Joi.string().trim().min(1),
  description: Joi.string().allow('', null),
  ingredients: Joi.array().items(Joi.string().trim().min(1)).min(1),
  instructions: Joi.array()
    .items(
      Joi.object({
        text: Joi.string().trim().min(1).required(),
        timer: Joi.object({
          hasTimer: Joi.boolean(),
          duration: Joi.number().min(0),
        }),
      })
    )
    .min(1),
  categories: Joi.array().items(objectId),
  prepTime: Joi.object({
    hours: Joi.number().min(0),
    minutes: Joi.number().min(0),
  }),
  servings: Joi.string().allow('', null),
  notes: Joi.string().allow('', null),
  isFavorite: Joi.boolean(),
  imageUrl: Joi.string().allow('', null),
}).min(1);

export const idSchema = Joi.object({
  id: objectId.required(),
});

export const listQuerySchema = Joi.object({
  category: objectId.optional(),
  favorite: Joi.string().valid('true', 'false').optional(),
  q: Joi.string().trim().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(20).optional(),
});
