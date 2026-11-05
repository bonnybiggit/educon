import { Router } from 'express';
import { env } from '../config/env.js';
import { isUsingMemoryStore } from '../config/database.js';
import { sendSuccess } from '../middleware/http.js';
import { buildInfo } from '../services/versionService.js';

const router = Router();

// Non-sensitive deployment facts only: lets the owner confirm which code and mode the live process runs.
router.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  sendSuccess(res, {
    message: 'API is healthy',
    data: {
      status: 'ok',
      commit: buildInfo.commit,
      startedAt: buildInfo.startedAt,
      mode: env.nodeEnv,
      database: isUsingMemoryStore() ? 'memory' : 'mongodb',
    },
  });
});

export default router;
