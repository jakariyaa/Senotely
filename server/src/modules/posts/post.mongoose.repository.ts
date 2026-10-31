import { Types, type PipelineStage } from 'mongoose';
import { UserModel } from '../users/user.model.js';
import { PostModel } from './post.model.js';
import type {
  AuthorPosts,
  PostData,
  PostRepository,
} from './post.repository.js';

type AuthorPostsAggregation = {
  _id: Types.ObjectId;
  name: string;
  posts: Array<{
    _id: Types.ObjectId;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

function toPostData(post: AuthorPostsAggregation['posts'][number]): PostData {
  return {
    id: post._id.toString(),
    title: post.title,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export class MongoosePostRepository implements PostRepository {
  async create(
    author: string,
    input: { title: string; content: string },
  ): Promise<PostData> {
    const post = await PostModel.create({ ...input, author });
    return toPostData(
      post as unknown as AuthorPostsAggregation['posts'][number],
    );
  }

  async findByAuthor(input: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<AuthorPosts | null> {
    const pipeline: PipelineStage[] = [
      { $match: { _id: new Types.ObjectId(input.userId) } },
      {
        $lookup: {
          from: 'posts',
          localField: '_id',
          foreignField: 'author',
          pipeline: [
            { $sort: { _id: -1 } },
            { $skip: (input.page - 1) * input.limit },
            { $limit: input.limit + 1 },
            { $project: { author: 0, __v: 0 } },
          ],
          as: 'posts',
        },
      },
      { $project: { _id: 1, name: 1, posts: 1 } },
    ];

    const [result] =
      await UserModel.aggregate<AuthorPostsAggregation>(pipeline).exec();
    return result
      ? {
          user: { id: result._id.toString(), name: result.name },
          posts: result.posts.map(toPostData),
        }
      : null;
  }

  async deleteByAuthor(author: string): Promise<void> {
    await PostModel.deleteMany({ author });
  }
}
