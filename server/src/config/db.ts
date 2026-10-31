import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);
mongoose.set('autoIndex', env.MONGOOSE_AUTO_INDEX);

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
