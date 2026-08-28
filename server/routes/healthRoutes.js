import { Router } from 'express';
import { sendSuccess } from '../middleware/http.js';

const router = Router();

router.get('/health', (_req, res) => {
  sendSuccess(res, { message: 'API is healthy', data: { status: 'ok' } });
});

export default router;
