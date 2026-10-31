import { z } from 'zod';
import type { Role } from '../../shared/rbac/roles.js';
import { passwordSchema } from '../../shared/security/password.schema.js';

const interestsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(30)
      .transform((interest) => interest.toLowerCase()),
  )
  .max(20)
  .transform((interests) => [...new Set(interests)]);

const name = z.string().trim().min(1).max(100);
const email = z.email().trim().toLowerCase();
const role = z.enum(['user', 'admin']);

export const createManagedUserSchema = z.object({
  name,
  email,
  password: passwordSchema,
  role: role.default('user'),
  interests: interestsSchema.default([]),
});

export const updateManagedUserSchema = z
  .object({
    name: name.optional(),
    email: email.optional(),
    role: role.optional(),
    interests: interestsSchema.optional(),
    password: passwordSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0);

export const userIdSchema = z.string().regex(/^[\da-f]{24}$/i);

export const interestGroupsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  interest: z.string().trim().toLowerCase().min(1).max(30).optional(),
});

export type CreateManagedUserInput = z.infer<typeof createManagedUserSchema>;
export type UpdateManagedUserInput = {
  name?: string;
  email?: string;
  role?: Role;
  interests?: string[];
  password?: string;
};
export type InterestGroupsQuery = z.infer<typeof interestGroupsQuerySchema>;
