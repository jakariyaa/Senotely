import { z } from 'zod';
import { ValidationError } from '../errors/AppError.js';

const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

export type Pagination = { page: number; limit: number; skip: number };

export function parsePagination(query: unknown): Pagination {
  const parsed = paginationSchema.safeParse(query);
  if (!parsed.success) {
    throw new ValidationError('Invalid pagination parameters');
  }

  const page = Number(parsed.data.page ?? 1);
  const requestedLimit = Number(parsed.data.limit ?? 20);
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(requestedLimit) ||
    requestedLimit < 1
  ) {
    throw new ValidationError('Invalid pagination parameters');
  }

  const limit = Math.min(requestedLimit, 100);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) {
    throw new ValidationError('Invalid pagination parameters');
  }

  return { page, limit, skip };
}

export function buildMeta(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
