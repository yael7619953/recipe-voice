import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from '../middleware/error.middleware.js';
import { toolDeclarations, executeTool, extractAndCreateRecipeFromFile } from './agent-tools.service.js';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT =
  'You are the in-app assistant for a recipe manager. ' +
  'Use the available tools to search, read, update or organize the user\'s own recipes and categories. ' +
  'Never invent recipe data — always call a tool to fetch or change real data. ' +
  'Reply in the same language the user wrote in.';

function getModel() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new AppError('AI service is not configured', 503);
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
  return genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: toolDeclarations }],
  });
}

function toGeminiHistory(history) {
  return history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));
}

export async function chat({ userId, message, history = [], file }) {
  // File attached → deterministic extract+create, bypassing tool-choice guesswork
  if (file) {
    const recipe = await extractAndCreateRecipeFromFile(
      userId,
      file.path,
      file.mimetype,
      file.originalname
    );
    return {
      reply: `יצרתי טיוטת מתכון "${recipe.title}" מהקובץ שהעלית.`,
      toolCalled: 'extractAndCreateRecipeFromFile',
      data: recipe,
    };
  }

  const model = getModel();
  const chatSession = model.startChat({ history: toGeminiHistory(history) });

  const result = await chatSession.sendMessage(message);
  const call = result.response.functionCalls()?.[0];

  if (!call) {
    return { reply: result.response.text() };
  }

  let toolResult;
  try {
    toolResult = await executeTool(call.name, call.args, userId);
  } catch (err) {
    if (err instanceof AppError) {
      toolResult = { error: err.message };
    } else {
      throw err;
    }
  }

  // Send the tool result back so the model can phrase a natural reply
  const followUp = await chatSession.sendMessage([
    { functionResponse: { name: call.name, response: { result: toolResult } } },
  ]);

  return {
    reply: followUp.response.text(),
    toolCalled: call.name,
    data: toolResult,
  };
}