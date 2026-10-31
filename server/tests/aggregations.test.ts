import { afterEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { UserModel } from '../src/modules/users/user.model.js';
import { MongooseUserRepository } from '../src/modules/users/user.mongoose.repository.js';
import { MongoosePostRepository } from '../src/modules/posts/post.mongoose.repository.js';

afterEach(() => vi.restoreAllMocks());

describe('scenario aggregation query constraints', () => {
  it('groups interests with exactly one aggregate call and no other query method', async () => {
    const aggregate = vi.spyOn(UserModel, 'aggregate').mockReturnValue({
      exec: vi.fn().mockResolvedValue([
        {
          items: [{ interest: 'music', count: 1, users: [] }],
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
