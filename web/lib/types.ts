export type Role = 'user' | 'admin';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  interests: string[];
};

export type Note = {
  id: string;
  owner: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type Post = {
  id: string;
  author: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Page<T> = { data: T[]; meta: PageMeta };

export type ApiUserPosts = {
  data: { user: Pick<User, 'id' | 'name'>; posts: Post[] };
  meta: { page: number; limit: number; hasNextPage: boolean };
};

export type InterestGroup = {
  interest: string;
  count: number;
  users: Array<{ _id: string; name: string; email: string }>;
};

export type ActionState = {
  message?: string;
  error?: boolean;
};

export const emptyActionState: ActionState = {};
