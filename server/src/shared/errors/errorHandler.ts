import type { ErrorRequestHandler } from 'express';
import { AppError, ConflictError } from './AppError.js';

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  const normalized =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
      ? new ConflictError('Email already exists')
      : error instanceof AppError
        ? error
        : typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            error.status === 400
          ? new AppError('Invalid request', 400, 'BAD_REQUEST')
          : new AppError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');

  response.status(normalized.status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details === undefined
        ? {}
        : { details: normalized.details }),
    },
  });
};
