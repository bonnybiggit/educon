import { env } from '../config/env.js';

const isLocalDevelopmentOrigin = (origin) => {
  if (env.nodeEnv === 'production') return false;

  try {
    const { hostname, protocol } = new URL(origin);
    const isHttp = protocol === 'http:' || protocol === 'https:';
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isPrivateNetwork = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(hostname);

    return isHttp && (isLocalHost || isPrivateNetwork);
  } catch {
    return false;
  }
};

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

    if (isLocalDevelopmentOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
};
