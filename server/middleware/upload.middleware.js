import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { AppError } from './error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

export const MAX_FILE_SIZE =
  Number.parseInt(process.env.UPLOAD_MAX_FILE_SIZE ?? '', 10) || 25 * 1024 * 1024;

const EXTENSIONS = {
  pdf: ['.pdf'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff', '.heic', '.heif'],
  audio: ['.webm', '.mp3', '.wav', '.m4a'],
  docx: ['.docx'],
};

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function getExtension(filename) {
  return path.extname(filename).toLowerCase();
}

function hasExtension(filename, extensions) {
  return extensions.includes(getExtension(filename));
}

export function isAllowedFile(file, categories) {
  const allowed = Array.isArray(categories) ? categories : [categories];
  const { mimetype = '', originalname = '' } = file;

  return allowed.some((category) => {
    switch (category) {
      case 'pdf':
        return mimetype === 'application/pdf' || hasExtension(originalname, EXTENSIONS.pdf);
      case 'image':
        return mimetype.startsWith('image/') || hasExtension(originalname, EXTENSIONS.image);
      case 'audio':
        return (
          mimetype.startsWith('audio/') ||
          (mimetype === 'video/webm' && hasExtension(originalname, ['.webm'])) ||
          hasExtension(originalname, EXTENSIONS.audio)
        );
      case 'docx':
        return (
          mimetype ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          hasExtension(originalname, EXTENSIONS.docx)
        );
      default:
        return false;
    }
  });
}

export function createFileFilter(categories) {
  return (_req, file, cb) => {
    if (isAllowedFile(file, categories)) {
      cb(null, true);
      return;
    }
    cb(new AppError('Unsupported media type', 415));
  };
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = getExtension(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

function createMulter(categories) {
  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: createFileFilter(categories),
  });
}

export function singleUpload(categories, fieldName = 'file') {
  return createMulter(categories).single(fieldName);
}

export const pdfFileFilter = createFileFilter('pdf');
export const imageFileFilter = createFileFilter('image');
export const audioFileFilter = createFileFilter('audio');
export const mediaFileFilter = createFileFilter(['pdf', 'image', 'audio']);

export const uploadPdf = singleUpload('pdf', 'file');
export const uploadImage = singleUpload('image', 'file');
export const uploadAudio = singleUpload('audio', 'audio');
export const uploadMedia = singleUpload(['pdf', 'image', 'audio'], 'file');
export const uploadAiMedia = singleUpload(['pdf', 'image', 'docx'], 'file');
