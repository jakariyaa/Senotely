import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= 72,
    'must be at most 72 bytes',
  );
