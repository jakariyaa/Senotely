export interface PostRepository {
  create(
    author: string,
    input: { title: string; content: string },
  ): Promise<PostData>;
  findByAuthor(input: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<AuthorPosts | null>;
  deleteByAuthor(author: string): Promise<void>;
}

export type PostData = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthorPosts = {
  user: { id: string; name: string };
  posts: PostData[];
};
