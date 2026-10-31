import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);
mongoose.set('autoIndex', env.MONGOOSE_AUTO_INDEX);

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
}

export async function assertMongoVersion(): Promise<void> {
  const database = mongoose.connection.db;
  if (!database) throw new Error('MongoDB connection is not ready');

  const { version, versionArray } = await database.admin().buildInfo();
  if (!versionArray[0] || versionArray[0] < 9) {
    throw new Error(`MongoDB 9.0+ is required; connected server is ${version}`);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
