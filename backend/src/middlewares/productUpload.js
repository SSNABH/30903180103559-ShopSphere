import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { readFile, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

// Serverless filesystems are read-only outside the temp directory, so uploads
// go to a writable path when the API runs on Vercel.
const uploadDirectory = process.env.VERCEL
  ? path.join(os.tmpdir(), 'shopsphere-uploads', 'products')
  : path.resolve('uploads/products');
try {
  fs.mkdirSync(uploadDirectory, { recursive: true });
} catch (error) {
  console.error('Upload directory could not be created:', error.message);
}

const extensionByType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

async function removeUploadedFiles(files) {
  await Promise.all((files ?? []).map((file) => unlink(file.path).catch(() => {})));
}

function hasExpectedImageSignature(file, buffer) {
  if (file.mimetype === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (file.mimetype === 'image/png') {
    return buffer.length >= 8
      && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
}

async function validateUploadedImages(files) {
  for (const file of files ?? []) {
    const header = await readFile(file.path);
    if (!hasExpectedImageSignature(file, header)) {
      await removeUploadedFiles(files);
      throw new AppError('The uploaded file content does not match its image type.', 400, 'INVALID_IMAGE_CONTENT');
    }
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename(req, file, callback) {
      void req;
      callback(null, `${Date.now()}-${randomUUID()}${extensionByType[file.mimetype] ?? ''}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter(req, file, callback) {
    void req;
    if (!extensionByType[file.mimetype]) {
      callback(new AppError('Only JPEG, PNG, and WebP images are allowed.', 400, 'INVALID_IMAGE_TYPE'));
      return;
    }
    callback(null, true);
  },
});

export function uploadProductImages(req, res, next) {
  upload.array('images', 5)(req, res, (error) => {
    if (!error) {
      void validateUploadedImages(req.files).then(() => next()).catch(next);
      return;
    }
    if (error instanceof AppError) {
      void removeUploadedFiles(req.files).finally(() => next(error));
      return;
    }
    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 5 MB or smaller.'
        : 'The image upload could not be processed.';
      void removeUploadedFiles(req.files).finally(() => next(new AppError(message, 400, 'IMAGE_UPLOAD_ERROR')));
      return;
    }
    void removeUploadedFiles(req.files).finally(() => next(error));
  });
}
