import express from 'express';
import { errorHandler } from './shared/errors/errorHandler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });
  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });
  app.use(errorHandler);

  return app;
}
