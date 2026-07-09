import { AppError } from '../../middleware/error.middleware.js';
import * as gemini from './gemini.adapter.js';
import * as groq from './groq.adapter.js';

/**
 * Active LLM provider: `gemini` (default) or `groq`.
 * Set AI_PROVIDER in server/.env — both keys can coexist; only the active provider is used.
כו */
export function getProviderName() {
  const raw = (process.env.AI_PROVIDER ?? 'gemini').trim().toLowerCase();
  if (raw === 'gemini' || raw === 'groq') return raw;
  throw new AppError(
    `Unknown AI_PROVIDER "${process.env.AI_PROVIDER}". Use "gemini" or "groq".`,
    500,
  );
}

function getAdapter() {
  const name = getProviderName();
  if (name === 'groq') return groq;
  return gemini;
}

/** @returns {{ createAgentChat: Function, extractRecipeFromText: Function, extractRecipeFromImage: Function, id: string }} */
export function getLlmProvider() {
  return getAdapter();
}
