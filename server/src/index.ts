import express from 'express';
import { createApp } from './createApp.js';
import { assertMongoVersion, connectDatabase } from './config/db.js';
import { container } from './container.js';
import { NoteModel } from './modules/notes/note.model.js';
import { PostModel } from './modules/posts/post.model.js';
import { UserModel } from './modules/users/user.model.js';
import { logger } from './shared/logging/logger.js';

let databaseReady: Promise<void> | undefined;

function initializeDatabase(): Promise<void> {
  if (!databaseReady) {
    databaseReady = (async () => {
      await connectDatabase();
      await assertMongoVersion();
      await Promise.all([UserModel.init(), NoteModel.init(), PostModel.init()]);
    })().catch((error: unknown) => {
      databaseReady = undefined;
      throw error;
    });
  }

  return databaseReady;
}

const app = express();
app.disable('x-powered-by');
app.use(async (_request, response, next) => {
  try {
    await initializeDatabase();
    next();
  } catch {
    logger.error('Database initialization failed');
    response.status(503).json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable',
      },
    });
  }
});
app.use(createApp(container));

export default app;
