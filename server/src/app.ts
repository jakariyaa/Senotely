import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import type { Container } from './container.js';
import { logger } from './shared/logging/logger.js';
import { errorHandler } from './shared/errors/errorHandler.js';
import { authRateLimit } from './shared/middleware/rateLimit.js';

export function createApp(container: Container) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN }));
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });
  app.use('/auth', authRateLimit, authRoutes(container.authService));
  app.use(
    '/users',
    userRoutes(container.authService, container.tokens, container.users),
  );
  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });
  app.use(errorHandler);

  return app;
}
