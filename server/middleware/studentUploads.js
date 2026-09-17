import multer from 'multer';
import { AppError } from './http.js';

const maxFileSize = 5 * 1024 * 1024;
const allowedMimeTypes = {
  passport: new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  transcripts: new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  cv: new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSize, files: 3 },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes[file.fieldname]?.has(file.mimetype)) {
      callback(new AppError(`Unsupported ${file.fieldname} file type`, 400));
      return;
    }
    callback(null, true);
  },
});

export const studentUploads = (req, res, next) => {
  upload.fields([
    { name: 'passport', maxCount: 1 },
    { name: 'transcripts', maxCount: 1 },
    { name: 'cv', maxCount: 1 },
  ])(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError('Each document must be 5MB or smaller', 400));
      return;
    }
    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      next(new AppError('Only one file is allowed for each document field', 400));
      return;
    }
    next(error);
  });
};