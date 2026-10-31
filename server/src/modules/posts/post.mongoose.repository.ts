import { PostModel } from './post.model.js';
import type { PostRepository } from './post.repository.js';

export class MongoosePostRepository implements PostRepository {
  async deleteByAuthor(author: string): Promise<void> {
    await PostModel.deleteMany({ author });
  }
}
