import type { RequestHandler } from 'express';
import type { AuthService } from '../auth/auth.service.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';

export function userController(service: AuthService) {
  const me: RequestHandler = async (request, response) => {
    if (!request.actor) {
      throw new UnauthorizedError();
    }
    response.json(await service.getCurrentUser(request.actor.id));
  };

  return { me };
}
