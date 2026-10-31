import {
  assertMongoVersion,
  connectDatabase,
  disconnectDatabase,
} from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { NoteModel } from '../src/modules/notes/note.model.js';
import { PostModel } from '../src/modules/posts/post.model.js';
import { UserModel } from '../src/modules/users/user.model.js';

type ExplainRow = {
  query: string;
  index: string;
  docsExamined: number | string;
  keysExamined: number | string;
  nReturned: number | string;
};

function findNumber(value: unknown, key: string): number | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  if (key in record && typeof record[key] === 'number') return record[key];
  for (const child of Object.values(record)) {
    const result = findNumber(child, key);
    if (result !== undefined) return result;
  }
  return undefined;
}

function findMaxNumber(value: unknown, key: string): number | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const own = typeof record[key] === 'number' ? record[key] : undefined;
  const nested = Object.values(record)
    .map((child) => findMaxNumber(child, key))
    .filter((number): number is number => number !== undefined);
  return [...nested, ...(own === undefined ? [] : [own])].reduce<
    number | undefined
  >(
    (largest, number) =>
      largest === undefined || number > largest ? number : largest,
    undefined,
  );
}

function hasLookupIndex(value: unknown, index: string): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.indexesUsed) && record.indexesUsed.includes(index)) {
    return true;
  }
  return Object.values(record).some((child) => hasLookupIndex(child, index));
}

function containsIndexStage(value: unknown, index: string): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  if (
    record.indexName === index ||
    (index === '_id_' && record.stage === 'IDHACK')
  ) {
    return true;
  }
  return Object.values(record).some((child) =>
    containsIndexStage(child, index),
  );
}

function hasWinningIndex(value: unknown, index: string): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return Object.entries(record).some(([key, child]) =>
    key === 'winningPlan'
      ? containsIndexStage(child, index)
      : hasWinningIndex(child, index),
  );
}

async function explain(
  query: string,
  expectedIndex: string,
  operation: () => Promise<unknown>,
  forbidSort = false,
  requireLookupIndex = false,
  maxDocsExamined?: number,
): Promise<ExplainRow> {
  const result = await operation();
  const serialized = JSON.stringify(result);
  const usesExpectedIndex = requireLookupIndex
    ? hasLookupIndex(result, expectedIndex)
    : hasWinningIndex(result, expectedIndex);
  if (!usesExpectedIndex) {
    throw new Error(`${query} winning plan did not use ${expectedIndex}`);
  }
  if (forbidSort && /"stage"\s*:\s*"SORT"/.test(serialized)) {
    throw new Error(`${query} contains an unexpected in-memory SORT stage`);
  }
  if (requireLookupIndex && !hasWinningIndex(result, '_id_')) {
    throw new Error(`${query} initial user match did not use _id_`);
  }
  const docsExamined = findMaxNumber(result, 'totalDocsExamined');
  if (query === 'Q12 public posts lookup' && docsExamined === undefined) {
    throw new Error(`${query} did not report totalDocsExamined`);
  }
  if (
    maxDocsExamined !== undefined &&
    docsExamined !== undefined &&
    docsExamined > maxDocsExamined
  ) {
    throw new Error(
      `${query} examined ${docsExamined} documents; expected at most ${maxDocsExamined}`,
    );
  }
  return {
    query,
    index: expectedIndex,
    docsExamined: docsExamined ?? '-',
    keysExamined: findMaxNumber(result, 'totalKeysExamined') ?? '-',
    nReturned: findNumber(result, 'nReturned') ?? '-',
  };
}

try {
  if (!env.SEED_ADMIN_EMAIL)
    throw new Error('SEED_ADMIN_EMAIL is required; run pnpm seed first');
  await connectDatabase();
  await assertMongoVersion();
  const database = NoteModel.db.db;
  if (!database) throw new Error('MongoDB connection is not ready');

  const heavyUser = await UserModel.findOne({
    email: 'seed-user-00001@example.test',
  })
    .select('_id')
    .lean();
  const sampleNote = await NoteModel.findOne({ owner: heavyUser?._id })
    .select('_id')
    .lean();
  if (!heavyUser || !sampleNote)
    throw new Error('Seed data missing; run pnpm seed first');

  const owner = heavyUser._id;
  const noteId = sampleNote._id;
  const userId = owner;
  const page = 1;
  const limit = 20;
  const scenario2 = [
    { $match: { _id: userId } },
    {
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
        pipeline: [
          { $sort: { _id: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit + 1 },
          { $project: { author: 0, __v: 0 } },
        ],
        as: 'posts',
      },
    },
    { $project: { _id: 1, name: 1, posts: 1 } },
  ];
  const scenario1 = [
    { $match: { interests: 'technology' } },
    { $project: { name: 1, email: 1, interests: 1 } },
    { $unwind: '$interests' },
    { $match: { interests: 'technology' } },
    {
      $group: {
        _id: '$interests',
        count: { $sum: 1 },
        users: {
          $topN: {
            output: { _id: '$_id', name: '$name', email: '$email' },
            sortBy: { name: 1, _id: 1 },
            n: 20,
          },
        },
      },
    },
    { $sort: { _id: 1 } },
    {
      $facet: {
        items: [{ $skip: 0 }, { $limit: limit }],
        total: [{ $count: 'value' }],
      },
    },
  ];

  const rows = await Promise.all([
    explain('Q1 login', 'email_1', () =>
      UserModel.findOne({ email: env.SEED_ADMIN_EMAIL })
        .select('+passwordHash')
        .explain('executionStats'),
    ),
    explain('Q3 get user by id', '_id_', () =>
      UserModel.findById(owner).explain('executionStats'),
    ),
    explain(
      'Q4 admin list users',
      '_id_',
      () =>
        UserModel.find()
          .sort({ _id: -1 })
          .skip(20)
          .limit(20)
          .explain('executionStats'),
      true,
    ),
    explain(
      'Q5 notes by owner',
      'owner_1__id_-1',
      () =>
        NoteModel.find({ owner })
          .sort({ _id: -1 })
          .skip(0)
          .limit(limit)
          .explain('executionStats'),
      true,
    ),
    explain(
      'Q6 all notes',
      '_id_',
      () =>
        NoteModel.find()
          .sort({ _id: -1 })
          .skip(0)
          .limit(limit)
          .explain('executionStats'),
      true,
    ),
    explain(
      'Q7 admin notes by user',
      'owner_1__id_-1',
      () =>
        NoteModel.find({ owner })
          .sort({ _id: -1 })
          .skip(0)
          .limit(limit)
          .explain('executionStats'),
      true,
    ),
    explain('Q8 note by id and owner', '_id_', () =>
      NoteModel.findOne({ _id: noteId, owner }).explain('executionStats'),
    ),
    explain('Q9 count notes by owner', 'owner_1__id_-1', () =>
      database.command({
        explain: { count: 'notes', query: { owner } },
        verbosity: 'executionStats',
      }),
    ),
    explain('Q10 cascade delete notes', 'owner_1__id_-1', () =>
      NoteModel.deleteMany({ owner }).explain('executionStats'),
    ),
    explain('Q11 cascade delete posts', 'author_1__id_-1', () =>
      PostModel.deleteMany({ author: owner }).explain('executionStats'),
    ),
    explain(
      'Q12 public posts lookup',
      'author_1__id_-1',
      () => UserModel.aggregate(scenario2 as never).explain('executionStats'),
      false,
      true,
      2 * (limit + 1),
    ),
    explain('Q13 filtered interest grouping', 'interests_1', () =>
      UserModel.aggregate(scenario1 as never).explain('executionStats'),
    ),
  ]);

  console.info('Query | Index | docsExamined | keysExamined | nReturned');
  for (const row of rows) {
    console.info(
      `${row.query} | ${row.index} | ${row.docsExamined} | ${row.keysExamined} | ${row.nReturned}`,
    );
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
