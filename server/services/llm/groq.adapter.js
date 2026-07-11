import Groq from 'groq-sdk';
import fs from 'fs';
import { AppError } from '../../middleware/error.middleware.js';
import { mapLlmError } from './llm.errors.js';

const MODEL =
  process.env.GROQ_MODEL?.trim() || 'meta-llama/llama-4-scout-17b-16e-instruct';

const EXTRACT_SYSTEM_PROMPT = [
  'You are a recipe extraction assistant.',
  'Extract every recipe detail from the provided content and return it as structured JSON only (no markdown).',
  'For optional fields (description, notes) return null when the information is absent.',
  'JSON shape:',
  '{',
  '  "title": string,',
  '  "description": string | null,',
  '  "ingredients": string[],',
  '  "instructions": [ { "text": string, "timer": { "duration": number, "hasTimer": boolean } } ],',
  '  "prepTime": { "hours": number, "minutes": number },',
  '  "servings": string,',
  '  "notes": string | null',
  '}',
  'timer.duration is in minutes (0 if none).',
].join(' ');

function requireApiKey() {
  if (!process.env.GROQ_API_KEY?.trim()) {
    throw new AppError('AI service is not configured (GROQ_API_KEY)', 503);
  }
  return process.env.GROQ_API_KEY.trim();
}

function getClient() {
  return new Groq({ apiKey: requireApiKey() });
}

/**
 * Llama models on Groq sometimes stringify booleans (e.g. "true" instead of true).
 * Groq validates arguments against the declared schema before we ever see the call,
 * so a strict `type: 'boolean'` causes a 400 tool_use_failed. Widen boolean properties
 * to accept booleans or strings here; executeTool normalizes the value back.
 */
function widenBooleanTypes(schema) {
  if (!schema || typeof schema !== 'object') return schema;

  if (schema.type === 'boolean') {
    return { ...schema, type: ['boolean', 'string'] };
  }

  if (schema.properties) {
    const properties = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      properties[key] = widenBooleanTypes(value);
    }
    return { ...schema, properties };
  }

  if (schema.items) {
    return { ...schema, items: widenBooleanTypes(schema.items) };
  }

  return schema;
}

/** Convert our toolDeclarations to OpenAI/Groq tools format. */
function toGroqTools(tools) {
  return (tools ?? []).map((t) => {
    const parameters = {
      type: 'object',
      properties: widenBooleanTypes({ properties: t.parameters?.properties ?? {} })
        .properties,
      additionalProperties: false,
    };
    if (Array.isArray(t.parameters?.required) && t.parameters.required.length) {
      parameters.required = t.parameters.required;
    }
    return {
      type: 'function',
      function: {
        name: t.name,
        description: t.description ?? '',
        parameters,
      },
    };
  });
}

const GROQ_TOOL_DISCIPLINE = [
  'You must use the API tool/function calling interface for every tool call — never write fake tool markers like [listCategories] in the message content.',
  'To import a recipe from the attached file, emit a real tool call to extractRecipeFromFile with {"confirm": true} — do not mention that tool name in your text reply to the user.',
  'Never mention any tool or function name to the user in plain text, in any language. Speak only about the recipe/action itself (e.g. "save this recipe", "use this photo as the cover").',
  'The conversation history you receive is text-only — it never contains the real database ids from earlier tool calls, even ones you made yourself. So whenever a message (this one or an earlier one) names a recipe or category, call listCategories/searchRecipes/getCategoryDetails again in THIS turn to get its real id before doing anything else with it. Do this even for something you just created or that a previous reply already said was "added" or "successful".',
  'Never output a text reply asking whether something exists or asking for its id/identifier (in any language, e.g. "האם הקטגוריה קיימת?", "מהו המזהה?") — that is always wrong; call the lookup tool instead and act on the result.',
].join(' ');


/** Convert provider-agnostic parts to OpenAI-style message content. */
function toGroqContent(parts) {
  if (typeof parts === 'string') {
    return parts;
  }

  const content = [];
  for (const p of parts) {
    if (p.type === 'text') {
      content.push({ type: 'text', text: p.text });
    } else if (p.type === 'image') {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${p.mimeType};base64,${p.base64}`,
        },
      });
    } else {
      throw new AppError(`Unsupported message part type: ${p?.type}`, 400);
    }
  }

  // Single text part → plain string (simpler for non-vision turns)
  if (content.length === 1 && content[0].type === 'text') {
    return content[0].text;
  }
  return content;
}

function parseRecipeContent(text) {
  if (!text?.trim()) {
    throw new AppError('AI returned no recipe data', 502);
  }
  let raw = text.trim();
  // Strip optional markdown fences
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError('AI returned invalid recipe JSON', 502);
  }
}

function parseToolArgs(argumentsJson) {
  if (!argumentsJson) return {};
  let parsed;
  try {
    parsed = typeof argumentsJson === 'string'
      ? JSON.parse(argumentsJson)
      : argumentsJson;
  } catch {
    return {};
  }
  return normalizeStringBooleans(parsed);
}

/** Some models emit "true"/"false" strings instead of real booleans; coerce them back. */
function normalizeStringBooleans(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === 'true') result[key] = true;
    else if (value === 'false') result[key] = false;
    else result[key] = value;
  }
  return result;
}

function turnFromCompletion(completion) {
  const msg = completion.choices?.[0]?.message;
  if (!msg) {
    throw new AppError('AI returned an empty response', 502);
  }

  const toolCalls = msg.tool_calls;
  if (toolCalls?.length) {
    const tc = toolCalls[0];
    return {
      text: null,
      toolCall: {
        name: tc.function.name,
        args: parseToolArgs(tc.function.arguments),
        id: tc.id,
        rawAssistantMessage: msg,
      },
    };
  }

  return { text: msg.content ?? '', toolCall: null };
}

/**
 * @param {{ systemPrompt: string, tools: object[], history?: { role: string, text: string }[] }} opts
 */
export function createAgentChat({ systemPrompt, tools, history = [] }) {
  const client = getClient();
  const groqTools = toGroqTools(tools);

  const messages = [
    { role: 'system', content: `${systemPrompt} ${GROQ_TOOL_DISCIPLINE}` },
    ...(history ?? []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.text,
    })),
  ];

  async function send(parts) {
    try {
      messages.push({ role: 'user', content: toGroqContent(parts) });
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: groqTools,
        tool_choice: 'auto',
        parallel_tool_calls: false,
      });
      return turnFromCompletion(completion);
    } catch (err) {
      throw mapLlmError(err);
    }
  }

  async function continueWithToolResult(toolCall, toolResult) {
    try {
      // Replay the assistant turn that requested the tool (required by the API)
      if (toolCall.rawAssistantMessage) {
        messages.push(toolCall.rawAssistantMessage);
      } else {
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: toolCall.id,
              type: 'function',
              function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.args ?? {}),
              },
            },
          ],
        });
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        name: toolCall.name,
        content: JSON.stringify(toolResult ?? {}),
      });

      const completion = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: groqTools,
        tool_choice: 'auto',
        parallel_tool_calls: false,
      });
      return turnFromCompletion(completion);
    } catch (err) {
      throw mapLlmError(err);
    }
  }

  return { send, continueWithToolResult };
}

export async function extractRecipeFromText(text) {
  try {
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract the recipe from the following text:\n\n${text}`,
        },
      ],
      response_format: { type: 'json_object' },
    });
    return parseRecipeContent(completion.choices?.[0]?.message?.content);
  } catch (err) {
    throw mapLlmError(err);
  }
}

export async function extractRecipeFromImage(filePath, mimeType) {
  try {
    const client = getClient();
    const base64 = fs.readFileSync(filePath).toString('base64');
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the recipe from this image.' },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });
    return parseRecipeContent(completion.choices?.[0]?.message?.content);
  } catch (err) {
    throw mapLlmError(err);
  }
}

export const id = 'groq';
