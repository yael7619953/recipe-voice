import fs from 'fs';
import path from 'path';
import { AppError } from '../middleware/error.middleware.js';
import { extractDocxText, extractPdfText } from './ai.service.js';
import { toolDeclarations, executeTool } from './agent-tools.service.js';
import { getLlmProvider } from './llm/llm.provider.js';

const MAX_TOOL_ROUNDS = 5;

const SYSTEM_PROMPT = [
  'You are the in-app assistant for a recipe manager.',
  'Use the available tools to search, read, update, or organize the user\'s own recipes and categories.',
  'Never invent recipe data — always call a tool to fetch or change real data.',
  'Reply in the same language the user wrote in.',
  'IMPORTANT: this chat window has a real attach button (a paperclip icon next to the text input) that lets the user attach a PDF, Word document, or image directly to their message.',
  'You are fully able to receive and process files/images this way — never tell the user that you cannot accept files, images, or photos, and never claim this capability does not exist.',
  'If the user mentions they have a photo, scan, or written document of a recipe but has not attached anything yet in this turn, tell them to use the attach/paperclip button in this chat to send it (do not say to paste a description instead, unless they explicitly prefer to type the recipe as text).',
  'Pasting the recipe as plain text is only an alternative for users who prefer typing — always mention the attach button as the primary way to send a photo or document.',
  'CRITICAL: tool and function names (like searchRecipes, extractRecipeFromFile, attachRecipeImage, updateRecipe) are internal implementation details.',
  'NEVER mention a tool/function name to the user, in any language, for any reason — not in questions, not in confirmations, not in explanations. The user must never see these identifiers.',
  'Speak naturally instead: say "Do you want me to save this as a new recipe?" or "Should I use this photo as the cover for that recipe?" — never "I will use extractRecipeFromFile" or similar.',
  'Database ids (recipe id, category id, etc.) are internal implementation details too — never ask the user for one, and never say things like "I need the category id" or "what is the id".',
  'When a user refers to something by name (a recipe title, a category like "desserts"), resolve it yourself: call the relevant lookup tool (searchRecipes, listCategories, getCategoryDetails) first and use the id you get back — do not ask the user to supply or confirm an id.',
  'Only ask the user a clarifying question when the lookup is genuinely ambiguous (e.g. two categories with a similar name), and phrase it in plain terms using the names, never mentioning ids or tools.',
  'If a name the user gave has no match after searching, say so in plain language and ask them to confirm the exact name — still without mentioning ids.',
  'Never narrate a plan of which tools you will call. Either call a tool via the function-calling interface, or reply to the user in plain natural language — never both in one step, and never describe the mechanism.',
  'Do not manually copy ingredients or steps from an attached file into your reply when importing; call the extraction tool instead of retyping the recipe.',
  'When the user attaches a file (PDF, Word document, or image), infer their intent from natural language and from the file contents — do not rely on fixed command phrases.',
  'Typical intents include: extract a recipe from the file into a new recipe, or attach an image as the cover photo of an existing recipe.',
  'Before acting on an attached file, judge what the file actually is:',
  'a recipe document or scan (ingredients/steps text, handwritten or printed recipe card, screenshot of a recipe);',
  'a food or dish photo suitable as a recipe cover;',
  'or something unrelated to recipes or cooking.',
  'For PDF and Word: if it is a recipe and the user wants it saved, call the extraction tool immediately (do not re-type the recipe, and do not tell the user which tool you are calling).',
  'If the same message also asks to put the recipe in a specific category, resolve that category\'s id first (listCategories/getCategoryDetails) and pass it in the extraction tool\'s categories argument in that same call — never create the recipe with the plain "new recipe" tool instead, since that tool cannot read the file and would leave the recipe empty.',
  'For images: a plated dish is usually a cover-photo candidate; a written/printed recipe is usually meant for extraction; unrelated images should be refused politely.',
  'To set a cover photo on an existing recipe when the user uploaded an image this turn, look up the recipe by name first if needed, then attach the image — without naming any tool to the user.',
  'If the intent is unclear (for example a file with little or no message), ask what they want before changing any data — you may briefly say what the file looks like to help them choose.',
  'If the file is unrelated to recipes or cooking, explain that you cannot use it and do not invent a recipe from it.',
  'Only call a mutating tool when the intent is clear enough; otherwise ask a short clarifying question.',
].join(' ');

const LANGUAGE_NAMES = { he: 'Hebrew (עברית)', en: 'English' };

/**
 * Build a strong language directive from the client's UI language, so the model
 * doesn't get confused by English text we inject for file metadata / extracted content.
 */
function languageDirective(language) {
  const name = LANGUAGE_NAMES[language];
  if (!name) return '';
  return (
    ` The user interface language is ${name}. Always reply to the user in ${name}, ` +
    'no matter what language any attached file content, extracted text, or file metadata in this conversation is written in.'
  );
}

/**
 * Provider-agnostic user message parts (text + optional image).
 * PDF/DOCX become extracted text; images become { type: 'image', ... }.
 */
async function buildUserParts(message, file) {
  const userText = (message ?? '').trim();

  if (!file) {
    return [{ type: 'text', text: userText }];
  }

  const uploadUrl = `/uploads/${file.filename}`;
  const header =
    (userText || '(The user attached a file with no text message.)') +
    `\n\n[Attached file: "${file.originalname}" (${file.mimetype}). Stored at ${uploadUrl}.` +
    ' Assess whether this is a recipe document/scan, a food photo for a recipe cover, or unrelated — then follow the user intent or ask if unclear.]';

  const parts = [{ type: 'text', text: header }];
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = file.mimetype || '';

  if (mime.startsWith('image/')) {
    const base64 = fs.readFileSync(file.path).toString('base64');
    parts.push({ type: 'image', mimeType: mime, base64 });
    return parts;
  }

  if (mime === 'application/pdf' || ext === '.pdf') {
    const text = await extractPdfText(file.path);
    parts.push({
      type: 'text',
      text:
        'Extracted PDF text (use this to decide if it is a recipe or unrelated):\n\n' + text,
    });
    return parts;
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    const text = await extractDocxText(file.path);
    parts.push({
      type: 'text',
      text:
        'Extracted Word document text (use this to decide if it is a recipe or unrelated):\n\n' +
        text,
    });
    return parts;
  }

  parts.push({
    type: 'text',
    text: 'This file type cannot be previewed as text or image for the assistant.',
  });
  return parts;
}

/** Drop a trailing user turn that duplicates the current message (client may include it). */
function priorHistory(history, message) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const last = history[history.length - 1];
  const current = (message ?? '').trim();
  if (last?.role === 'user' && (last.text ?? '').trim() === current) {
    return history.slice(0, -1);
  }
  return history;
}

export async function chat({ userId, message, history = [], file, language }) {
  const llm = getLlmProvider();
  const session = llm.createAgentChat({
    systemPrompt: SYSTEM_PROMPT + languageDirective(language),
    tools: toolDeclarations,
    history: priorHistory(history, message),
  });

  const userParts = await buildUserParts(message, file);
  let turn = await session.send(userParts);
  let lastTool = null;
  let lastData = null;
  const toolsCalled = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    if (!turn.toolCall) {
      const reply = turn.text ?? '';
      if (lastTool) {
        return { reply, toolCalled: lastTool, toolsCalled, data: lastData };
      }
      return { reply };
    }

    let toolResult;
    try {
      toolResult = await executeTool(
        turn.toolCall.name,
        turn.toolCall.args,
        userId,
        file ?? null,
      );
    } catch (err) {
      if (err instanceof AppError) {
        toolResult = { error: err.message };
      } else if (err.name === 'ValidationError' || err.name === 'CastError') {
        // Feed schema mismatches back to the model instead of failing the whole
        // request — it can fix the arguments and retry, or explain to the user.
        toolResult = { error: `Invalid data: ${err.message}` };
      } else {
        throw err;
      }
    }

    lastTool = turn.toolCall.name;
    lastData = toolResult;
    toolsCalled.push(lastTool);
    turn = await session.continueWithToolResult(turn.toolCall, toolResult);
  }

  return {
    reply: turn.text ?? '',
    toolCalled: lastTool,
    toolsCalled,
    data: lastData,
  };
}
