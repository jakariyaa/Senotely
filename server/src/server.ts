import { createServer } from 'node:http';
import { createApp } from './createApp.js';
import {
  assertMongoVersion,
  connectDatabase,
  disconnectDatabase,
} from './config/db.js';
import { container } from './container.js';
import { env } from './config/env.js';
import { NoteModel } from './modules/notes/note.model.js';
import { PostModel } from './modules/posts/post.model.js';
import { UserModel } from './modules/users/user.model.js';

const server = createServer(createApp(container));

try {
  await connectDatabase();
  await assertMongoVersion();
  await Promise.all([UserModel.init(), NoteModel.init(), PostModel.init()]);
  server.listen(env.PORT, () => {
    console.info(`API listening on port ${env.PORT}`);
  });
} catch (error) {
  console.error('Server startup failed:', error);
  process.exitCode = 1;
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  });
}
