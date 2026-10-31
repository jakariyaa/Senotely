import { Router } from 'express';
import type { AuthService } from '../auth/auth.service.js';
import type { TokenService } from '../../shared/security/TokenService.js';
import type { UserRepository } from './user.repository.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { userController } from './user.controller.js';

export function userRoutes(
  service: AuthService,
  tokens: TokenService,
  users: UserRepository,
): Router {
  const router = Router();
  router.get('/me', authenticate(tokens, users), userController(service).me);
  return router;
}
