import multer from 'multer';
import { AppError } from './http.js';

const maxFileSize = 5 * 1024 * 1024;

const scanTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const imageOnlyTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const writtenDocumentTypes = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const letterTypes = new Set([...writtenDocumentTypes, ...scanTypes]);

const allowedMimeTypes = {
  passport: scanTypes,
  transcripts: scanTypes,
  cv: writtenDocumentTypes,
  waec: scanTypes,
  waecScratchCard: imageOnlyTypes,
  degreeCertificate: scanTypes,
  statementOfPurpose: writtenDocumentTypes,
  academicReferenceLetter: letterTypes,
  professionalReferenceLetter: letterTypes,
};

export const studentDocumentFields = Object.keys(allowedMimeTypes);

const uploadFields = Object.keys(allowedMimeTypes).map((name) => ({ name, maxCount: 1 }));

// Magic-byte signatures so a spoofed extension/Content-Type cannot bypass the field's mimetype allow-list.
const matchesSignature = (buffer, mimetype) => {
  if (!buffer || buffer.length < 4) return false;
  switch (mimetype) {
    case 'application/pdf':
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'image/jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/gif':
      return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    case 'image/webp':
      return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'application/msword':
      return buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    default:
      return false;
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: uploadFields.length },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes[file.fieldname]?.has(file.mimetype)) {
      callback(new AppError(`Unsupported ${file.fieldname} file type`, 400));
      return;
    }
    callback(null, true);
  },
});

export const studentUploads = (req, res, next) => {
  upload.fields(uploadFields)(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        next(new AppError('Each document must be 5MB or smaller', 400));
        return;
      }
      if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
        next(new AppError('Only one file is allowed for each document field', 400));
        return;
      }
      next(error);
      return;
    }

    const mismatchedField = Object.values(req.files || {})
      .flat()
      .find((file) => !matchesSignature(file.buffer, file.mimetype));
    if (mismatchedField) {
      next(new AppError(`Unsupported ${mismatchedField.fieldname} file content`, 400));
      return;
    }

    next();
  });
};