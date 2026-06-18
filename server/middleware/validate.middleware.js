import { AppError } from './error.middleware.js';

function createValidator(source, targetKey) {
  return (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.') || d.context?.key || 'unknown',
        message: d.message,
      }));
      return next(new AppError('Validation failed', 400, errors));
    }

    req[targetKey ?? source] = value;
    next();
  };
}

export const validateBody = createValidator('body');
export const validateParams = createValidator('params');
// Express 5: req.query is read-only — store validated query on a separate property
export const validateQuery = createValidator('query', 'validatedQuery');

/** @deprecated Use validateBody */
export const validate = validateBody;
