import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { env } from './config/env.js';

const server = createServer(createApp());

try {
  await connectDatabase();
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
