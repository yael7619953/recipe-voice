export class AppError extends Error {
  constructor(message, statusCode = 500, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

function mapError(err) {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    };
  }

  if (err.name === 'ValidationError' && err.errors) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      })),
    };
  }

  if (err.name === 'CastError') {
    return { statusCode: 400, message: 'Invalid identifier' };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'field';
    return {
      statusCode: 409,
      message: 'Resource already exists',
      errors: [{ field, message: `${field} is already taken` }],
    };
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Invalid or expired token' };
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { statusCode: 413, message: 'File too large' };
    }
    return { statusCode: 400, message: err.message || 'Upload failed' };
  }

  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request payload too large' };
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return { statusCode: 400, message: 'Invalid JSON body' };
  }

  return { statusCode: 500, message: 'Internal server error' };
}

export function errorHandler(err, req, res, next) {
  const { statusCode, message, errors } = mapError(err);

  if (statusCode >= 500) {
    console.error(err);
  }

  const body = { success: false, message };
  if (errors?.length) {
    body.errors = errors;
  }

  res.status(statusCode).json(body);
}
