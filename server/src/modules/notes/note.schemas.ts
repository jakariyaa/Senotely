import { z } from 'zod';

export const noteIdSchema = z.string().regex(/^[\da-f]{24}$/i);

export const createNoteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(10000),
});

export const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().min(1).max(10000).optional(),
  })
  .refine((input) => Object.keys(input).length > 0);

export const adminNotesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  userId: noteIdSchema.optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = Partial<CreateNoteInput>;
export type AdminNotesQuery = z.infer<typeof adminNotesQuerySchema>;
