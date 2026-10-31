import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(10000),
});

export const postAuthorIdSchema = z.string().regex(/^[\da-f]{24}$/i);

export type CreatePostInput = z.infer<typeof createPostSchema>;
