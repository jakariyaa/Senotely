import {
  assertMongoVersion,
  connectDatabase,
  disconnectDatabase,
} from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { BcryptHasher } from '../src/shared/security/BcryptHasher.js';

try {
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to seed the admin',
    );
  }

  await connectDatabase();
  await assertMongoVersion();
  await UserModel.init();

  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  const passwordHash = await new BcryptHasher().hash(env.SEED_ADMIN_PASSWORD);
  await UserModel.updateOne(
    { email },
    {
      $set: {
        name: 'Seed Admin',
        email,
        passwordHash,
        role: 'admin',
      },
      $setOnInsert: { interests: [] },
    },
    { upsert: true, runValidators: true },
  );

  console.info(`Seeded admin ${email}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
