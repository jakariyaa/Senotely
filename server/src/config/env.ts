import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  MONGODB_URI: z.url().default('mongodb://127.0.0.1:27018/secure_notes'),
  WEB_ORIGIN: z.url({ protocol: /^https?$/ }).default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32, 'must contain at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  MONGOOSE_AUTO_INDEX: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = result.data;
