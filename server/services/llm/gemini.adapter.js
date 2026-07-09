import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { AppError } from '../../middleware/error.middleware.js';
import { recipeJsonSchema } from '../../utils/recipeSchema.js';
import { mapLlmError } from './llm.errors.js';

const MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

const EXTRACT_SYSTEM_PROMPT =
  'You are a recipe extraction assistant. ' +
  'Extract every recipe detail from the provided content and return it as structured JSON. ' +
  'For optional fields (description, notes) return null when the information is absent.';

function requireApiKey() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new AppError('AI service is not configured (GEMINI_API_KEY)', 503);
  }
  return process.env.GEMINI_API_KEY.trim();
}

function toGeminiHistory(history) {
  return (history ?? []).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));
}

/** Convert provider-agnostic parts to Gemini content parts. */
function toGeminiParts(parts) {
  if (typeof parts === 'string') {
    return parts;
  }

  return parts.map((p) => {
    if (p.type === 'text') {
      return { text: p.text };
    }
    if (p.type === 'image') {
      return { inlineData: { mimeType: p.mimeType, data: p.base64 } };
    }
    throw new AppError(`Unsupported message part type: ${p?.type}`, 400);
  });
}

function parseRecipeContent(text) {
  if (!text?.trim()) {
    throw new AppError('AI returned no recipe data', 502);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError('AI returned invalid recipe JSON', 502);
  }
}

function getExtractModel() {
  const genAI = new GoogleGenerativeAI(requireApiKey());
  return genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: EXTRACT_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: recipeJsonSchema,
    },
  });
}

/**
 * @param {{ systemPrompt: string, tools: object[], history?: { role: string, text: string }[] }} opts
 */
export function createAgentChat({ systemPrompt, tools, history = [] }) {
  requireApiKey();
  const genAI = new GoogleGenerativeAI(requireApiKey());
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: tools }],
  });

  const chatSession = model.startChat({ history: toGeminiHistory(history) });

  async function send(parts) {
    try {
      const result = await chatSession.sendMessage(toGeminiParts(parts));
      const call = result.response.functionCalls()?.[0];
      if (call) {
        return {
          text: null,
          toolCall: { name: call.name, args: call.args ?? {} },
        };
      }
      return { text: result.response.text(), toolCall: null };
    } catch (err) {
      throw mapLlmError(err);
    }
  }

  async function continueWithToolResult(toolCall, toolResult) {
    try {
      const result = await chatSession.sendMessage([
        {
          functionResponse: {
            name: toolCall.name,
            response: { result: toolResult },
          },
        },
      ]);
      const call = result.response.functionCalls()?.[0];
      if (call) {
        return {
          text: null,
          toolCall: { name: call.name, args: call.args ?? {} },
        };
      }
      return { text: result.response.text(), toolCall: null };
    } catch (err) {
      throw mapLlmError(err);
    }
  }

  return { send, continueWithToolResult };
}

export async function extractRecipeFromText(text) {
  try {
    const model = getExtractModel();
    const result = await model.generateContent(
      `Extract the recipe from the following text:\n\n${text}`,
    );
    return parseRecipeContent(result.response.text());
  } catch (err) {
    throw mapLlmError(err);
  }
}

export async function extractRecipeFromImage(filePath, mimeType) {
  try {
    const model = getExtractModel();
    const base64 = fs.readFileSync(filePath).toString('base64');
    const result = await model.generateContent([
      { text: 'Extract the recipe from this image.' },
      { inlineData: { mimeType, data: base64 } },
    ]);
    return parseRecipeContent(result.response.text());
  } catch (err) {
    throw mapLlmError(err);
  }
}

export const id = 'gemini';
