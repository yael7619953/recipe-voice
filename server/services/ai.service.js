import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import { AppError } from '../middleware/error.middleware.js';
import { getLlmProvider } from './llm/llm.provider.js';

export async function extractPdfText(filePath) {
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

export async function extractDocxText(filePath) {
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

/**
 * Extracts a structured recipe from an uploaded file (PDF / image / .docx).
 * Uses the active AI_PROVIDER (default: gemini). Does NOT save to DB or clean up the file.
 *
 * Timer durations are returned in minutes (as specified in recipeJsonSchema).
 * The client wizard converts them to seconds before saving via POST /api/recipes.
 */
export async function extractRecipeFromFile(filePath, mimeType, originalName) {
  const llm = getLlmProvider();
  const ext = path.extname(originalName).toLowerCase();

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const text = await extractPdfText(filePath);
    return llm.extractRecipeFromText(text);
  }

  if (mimeType.startsWith('image/')) {
    return llm.extractRecipeFromImage(filePath, mimeType);
  }

  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    const text = await extractDocxText(filePath);
    return llm.extractRecipeFromText(text);
  }

  throw new AppError('Unsupported file type for AI extraction', 415);
}
