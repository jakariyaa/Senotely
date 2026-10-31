import { NotFoundError } from '../../shared/errors/AppError.js';
import type { PostRepository } from './post.repository.js';
import type { CreatePostInput } from './post.schemas.js';

export class PostService {
  constructor(private readonly posts: PostRepository) {}

  create(author: string, input: CreatePostInput) {
    return this.posts.create(author, input);
  }

  async findByAuthor(input: { userId: string; page: number; limit: number }) {
    const result = await this.posts.findByAuthor(input);
    if (!result) throw new NotFoundError('User not found');

    const hasNextPage = result.posts.length > input.limit;
    return {
      user: result.user,
      posts: result.posts.slice(0, input.limit),
      meta: { page: input.page, limit: input.limit, hasNextPage },
    };
  }
}
