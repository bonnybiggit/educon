import { env } from '../config/env.js';

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
};
