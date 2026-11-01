import { randomBytes, randomInt } from 'node:crypto';
import {
  assertMongoVersion,
  connectDatabase,
  disconnectDatabase,
} from '../src/config/db.js';
import { NoteModel } from '../src/modules/notes/note.model.js';
import { PostModel } from '../src/modules/posts/post.model.js';
import { UserModel } from '../src/modules/users/user.model.js';
import { BcryptHasher } from '../src/shared/security/BcryptHasher.js';

const userCount = 5000;
const noteCount = 50000;
const postCount = 20000;
const heavyUserItems = 2000;
const interests = [
  'art',
  'books',
  'cooking',
  'cycling',
  'design',
  'fitness',
  'gaming',
  'gardening',
  'history',
  'music',
  'photography',
  'science',
  'travel',
  'technology',
  'writing',
  'hiking',
  'film',
  'finance',
  'education',
  'crafts',
  'nature',
  'language',
  'architecture',
  'food',
  'sports',
  'meditation',
  'history of art',
  'podcasts',
  'volunteering',
  'board games',
];

function sampleInterests(): string[] {
  const chosen = new Set<string>();
  const count = randomInt(2, 6);
  while (chosen.size < count) {
    const interest = interests[randomInt(interests.length)];
    if (interest) chosen.add(interest);
  }
  return [...chosen];
}

try {
  await connectDatabase();
  await assertMongoVersion();
  await Promise.all([UserModel.init(), NoteModel.init(), PostModel.init()]);

  const oldUsers = await UserModel.find({
    email: /^seed-user-\d+@example\.test$/,
  })
    .select('_id')
    .lean();
  const oldIds = oldUsers.map((user) => user._id);
  if (oldIds.length > 0) {
    await NoteModel.deleteMany({ owner: { $in: oldIds } });
    await PostModel.deleteMany({ author: { $in: oldIds } });
    await UserModel.deleteMany({ _id: { $in: oldIds } });
  }

  const hasher = new BcryptHasher();
  const seedUserHash = await hasher.hash(randomBytes(32).toString('base64url'));

  const users = await UserModel.insertMany(
    Array.from({ length: userCount }, (_, index) => ({
      name: `Seed User ${index + 1}`,
      email: `seed-user-${String(index + 1).padStart(5, '0')}@example.test`,
      passwordHash: seedUserHash,
      role: 'user' as const,
      interests: sampleInterests(),
    })),
    { ordered: true },
  );
  const heavyUserId = users[0]?._id;
  if (!heavyUserId)
    throw new Error('Seed user insert did not return the heavy user');
  const randomUserId = () => {
    const user = users[randomInt(users.length)];
    if (!user) throw new Error('Could not select a seed user');
    return user._id;
  };

  for (let start = 0; start < noteCount; start += 1000) {
    const batchSize = Math.min(1000, noteCount - start);
    await NoteModel.insertMany(
      Array.from({ length: batchSize }, (_, offset) => {
        const index = start + offset;
        return {
          owner: index < heavyUserItems ? heavyUserId : randomUserId(),
          title: `Seed note ${index + 1}`,
          content: `Seed content ${index + 1}`,
        };
      }),
    );
  }

  for (let start = 0; start < postCount; start += 1000) {
    const batchSize = Math.min(1000, postCount - start);
    await PostModel.insertMany(
      Array.from({ length: batchSize }, (_, offset) => {
        const index = start + offset;
        return {
          author: index < heavyUserItems ? heavyUserId : randomUserId(),
          title: `Seed post ${index + 1}`,
          content: `Seed content ${index + 1}`,
        };
      }),
    );
  }

  console.info(
    `Seeded ${userCount} users, ${noteCount} notes, and ${postCount} posts; heavy user ${heavyUserId}`,
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
