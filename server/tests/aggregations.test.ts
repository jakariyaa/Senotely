import { afterEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { UserModel } from '../src/modules/users/user.model.js';
import { MongooseUserRepository } from '../src/modules/users/user.mongoose.repository.js';
import { MongoosePostRepository } from '../src/modules/posts/post.mongoose.repository.js';
import { PostModel } from '../src/modules/posts/post.model.js';
import { NoteModel } from '../src/modules/notes/note.model.js';

afterEach(() => vi.restoreAllMocks());

describe('scenario aggregation query constraints', () => {
  it('declares exactly the four custom indexes', () => {
    const indexes = [UserModel, NoteModel, PostModel].flatMap((model) =>
      model.schema.indexes().map(([keys, options]) => ({
        collection: model.collection.collectionName,
        keys,
        unique: options.unique === true,
      })),
    );

    expect(indexes).toEqual([
      { collection: 'users', keys: { email: 1 }, unique: true },
      { collection: 'users', keys: { interests: 1 }, unique: false },
      { collection: 'notes', keys: { owner: 1, _id: -1 }, unique: false },
      { collection: 'posts', keys: { author: 1, _id: -1 }, unique: false },
    ]);
  });

  it('groups interests with exactly one aggregate call and no other query method', async () => {
    const aggregate = vi.spyOn(UserModel, 'aggregate').mockReturnValue({
      exec: vi.fn().mockResolvedValue([
        {
          items: [
            {
              interest: 'music',
              count: 1,
              users: [
                {
                  _id: 'user-id',
                  name: 'Music Fan',
                  email: 'fan@test.example',
                },
              ],
            },
          ],
          total: [{ value: 1 }],
        },
      ]),
    } as never);
    const forbidden = [
      vi.spyOn(UserModel, 'find'),
      vi.spyOn(UserModel, 'findOne'),
      vi.spyOn(UserModel, 'countDocuments'),
      vi.spyOn(UserModel, 'distinct'),
      vi.spyOn(UserModel, 'estimatedDocumentCount'),
    ];

    const result = await new MongooseUserRepository().groupByInterests({
      interest: 'music',
      page: 1,
      limit: 20,
      usersPerGroup: 20,
    });

    expect(aggregate).toHaveBeenCalledTimes(1);
    for (const spy of forbidden) expect(spy).not.toHaveBeenCalled();
    const pipeline = aggregate.mock.calls[0]?.[0] ?? [];
    expect(pipeline[0]).toEqual({ $match: { interests: 'music' } });
    expect(JSON.stringify(pipeline)).toContain('$topN');
    expect(JSON.stringify(pipeline)).not.toContain('passwordHash');
    expect(result.items).toEqual([
      {
        interest: 'music',
        count: 1,
        users: [
          { _id: 'user-id', name: 'Music Fan', email: 'fan@test.example' },
        ],
      },
    ]);
    expect(result.total).toBe(1);
  });

  it('loads a public author feed with exactly one aggregate call and no other query method', async () => {
    const aggregate = vi.spyOn(UserModel, 'aggregate').mockReturnValue({
      exec: vi
        .fn()
        .mockResolvedValue([
          { _id: new Types.ObjectId(), name: 'Public Name', posts: [] },
        ]),
    } as never);
    const forbidden = [
      vi.spyOn(UserModel, 'find'),
      vi.spyOn(UserModel, 'findOne'),
      vi.spyOn(UserModel, 'countDocuments'),
      vi.spyOn(UserModel, 'distinct'),
      vi.spyOn(UserModel, 'estimatedDocumentCount'),
    ];

    await new MongoosePostRepository().findByAuthor({
      userId: '507f1f77bcf86cd799439011',
      page: 1,
      limit: 20,
    });

    expect(aggregate).toHaveBeenCalledTimes(1);
    for (const spy of forbidden) expect(spy).not.toHaveBeenCalled();
    const pipeline = aggregate.mock.calls[0]?.[0] ?? [];
    const lookup = pipeline[1];
    expect(lookup).toMatchObject({
      $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'author',
      },
    });
    expect(JSON.stringify(lookup)).toContain('"$sort":{"_id":-1}');
    expect(JSON.stringify(pipeline)).not.toContain('email');
    expect(JSON.stringify(pipeline)).not.toContain('passwordHash');
  });
});
