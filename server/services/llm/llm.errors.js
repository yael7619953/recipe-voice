import { AppError } from '../../middleware/error.middleware.js';

/** Map provider SDK errors to AppError (shared by Gemini / Groq adapters). */
export function mapLlmError(err) {
  if (err instanceof AppError) return err;

  const status = err?.status ?? err?.statusCode;
  if (status === 429) {
    return new AppError(
      'AI quota exceeded. Please wait a minute and try again.',
      429,
    );
  }
  if (status === 401 || status === 403) {
    return new AppError('AI service authentication failed', 503);
  }

  return new AppError(
    `AI request failed: ${err?.message || 'unknown error'}`,
    502,
  );
}
