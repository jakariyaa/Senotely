import type { Model } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { NoteModel } from '../src/modules/notes/note.model.js';
import { PostModel } from '../src/modules/posts/post.model.js';
import { UserModel } from '../src/modules/users/user.model.js';

type IndexSpec = {
  name: string;
  key: Record<string, number>;
  unique: boolean;
};

const expectedIndexes: Record<string, IndexSpec[]> = {
  users: [
    { name: '_id_', key: { _id: 1 }, unique: false },
    { name: 'email_1', key: { email: 1 }, unique: true },
    { name: 'interests_1', key: { interests: 1 }, unique: false },
  ],
  notes: [
    { name: '_id_', key: { _id: 1 }, unique: false },
    { name: 'owner_1__id_-1', key: { owner: 1, _id: -1 }, unique: false },
  ],
  posts: [
    { name: '_id_', key: { _id: 1 }, unique: false },
    { name: 'author_1__id_-1', key: { author: 1, _id: -1 }, unique: false },
  ],
};

function indexIdentity(index: {
  name?: string;
  key: Record<string, unknown>;
  unique?: boolean;
  sparse?: boolean;
}): string {
  return `${index.name}:${JSON.stringify(index.key)}:${index.unique === true}:${index.sparse === true}`;
}

async function verifyModelIndexes(model: Model<unknown>): Promise<string[]> {
  const actual = await model.collection.indexes();
  const expected = expectedIndexes[model.collection.collectionName];

  if (!expected) {
    throw new Error(
      `No index allowlist for ${model.collection.collectionName}`,
    );
  }

  const expectedIdentities = expected
    .map((index) => ({ ...index, sparse: false }))
    .map(indexIdentity);
  const actualIdentities = actual.map(indexIdentity);
  const missing = expectedIdentities.filter(
    (identity) => !actualIdentities.includes(identity),
  );
  const extra = actualIdentities.filter(
    (identity) => !expectedIdentities.includes(identity),
  );

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${model.collection.collectionName} index mismatch; missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}`,
    );
  }

  return actualIdentities;
}

try {
  await connectDatabase();
  await Promise.all([UserModel.init(), NoteModel.init(), PostModel.init()]);

  for (const model of [UserModel, NoteModel, PostModel]) {
    const indexes = await verifyModelIndexes(model);
    console.info(`${model.collection.collectionName}: ${indexes.join(', ')}`);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
