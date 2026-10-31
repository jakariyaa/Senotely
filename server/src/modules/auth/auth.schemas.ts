import { z } from 'zod';
import { passwordSchema } from '../../shared/security/password.schema.js';

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
