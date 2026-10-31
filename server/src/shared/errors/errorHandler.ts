import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
      ? error.status
      : 500;

  response.status(status).json({
    error: {
      code: status === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
      message: status === 500 ? 'Internal server error' : 'Request failed',
    },
  });
};
