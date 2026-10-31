import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../errors/AppError.js';

export function validateBody(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(
        new ValidationError(
          'Invalid request body',
          result.error.issues.map(({ path, message }) => ({ path, message })),
        ),
      );
      return;
    }
    request.body = result.data;
    next();
  };
}
