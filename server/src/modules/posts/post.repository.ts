export interface PostRepository {
  deleteByAuthor(author: string): Promise<void>;
}
