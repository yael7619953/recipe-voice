import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { AppError } from '../middleware/error.middleware.js';
import { recipeJsonSchema } from '../utils/recipeSchema.js';

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT =
  'You are a recipe extraction assistant. ' +
  'Extract every recipe detail from the provided content and return it as structured JSON. ' +
  'For optional fields (description, notes) return null when the information is absent.';

function getGeminiModel() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new AppError('AI service is not configured', 503);
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

  return genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: recipeJsonSchema,
    },
  });
}

async function extractPdfText(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });

    try {
      const { text } = await parser.getText();

      if (!text?.trim()) {
        throw new AppError('Could not extract text from PDF', 422);
      }

      return text;
    } finally {
      await parser.destroy();
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Could not read PDF: ${err.message}`, 422);
  }
}

async function extractDocxText(filePath) {
  try {
    const { value: text } = await mammoth.extractRawText({ path: filePath });

    if (!text?.trim()) {
      throw new AppError('Could not extract text from Word document', 422);
    }

    return text;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Could not read Word document: ${err.message}`, 422);
  }
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

async function callLlmWithText(model, text) {
  try {
    const result = await model.generateContent(
      `Extract the recipe from the following text:\n\n${text}`,
    );

    return parseRecipeContent(result.response.text());
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`AI extraction failed: ${err.message}`, 502);
  }
}

async function callLlmWithImage(model, filePath, mimeType) {
  try {
    const base64 = fs.readFileSync(filePath).toString('base64');

    const result = await model.generateContent([
      { text: 'Extract the recipe from this image.' },
      { inlineData: { mimeType, data: base64 } },
    ]);

    return parseRecipeContent(result.response.text());
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`AI extraction failed: ${err.message}`, 502);
  }
}

/**
 * Extracts a structured recipe from an uploaded file (PDF / image / .docx).
 * Returns the parsed recipe object — does NOT save to DB or clean up the file.
 *
 * Timer durations are returned in minutes (as specified in recipeJsonSchema).
 * The client wizard converts them to seconds before saving via POST /api/recipes.
 *
 * @param {string} filePath     Absolute path to the uploaded file (req.file.path)
 * @param {string} mimeType     MIME type reported by multer (req.file.mimetype)
 * @param {string} originalName Original filename (req.file.originalname)
 */
export async function extractRecipeFromFile(filePath, mimeType, originalName) {
  const model = getGeminiModel();
  const ext = path.extname(originalName).toLowerCase();

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const text = await extractPdfText(filePath);
    return callLlmWithText(model, text);
  }

  if (mimeType.startsWith('image/')) {
    return callLlmWithImage(model, filePath, mimeType);
  }

  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    const text = await extractDocxText(filePath);
    return callLlmWithText(model, text);
  }

  throw new AppError('Unsupported file type for AI extraction', 415);
}
