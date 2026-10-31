import type { RequestHandler } from 'express';
import type { TokenService } from '../security/TokenService.js';
import type { UserRepository } from '../../modules/users/user.repository.js';
import { UnauthorizedError } from '../errors/AppError.js';

export function authenticate(
  tokens: TokenService,
  users: UserRepository,
): RequestHandler {
  return async (request, _response, next) => {
    const authorization = request.get('authorization');
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : '';
    const userId = token ? tokens.verify(token) : null;

    if (!userId) {
      next(new UnauthorizedError());
      return;
    }

    try {
      const actor = await users.findActorById(userId);
      if (!actor) {
        next(new UnauthorizedError());
        return;
      }
      request.actor = actor;
      next();
    } catch (error) {
      next(error);
    }
  };
}
