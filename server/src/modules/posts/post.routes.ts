import { Router } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { validateBody } from '../../shared/middleware/validate.js';
import type { TokenService } from '../../shared/security/TokenService.js';
import type { UserRepository } from '../users/user.repository.js';
import { createPostSchema } from './post.schemas.js';
import type { PostService } from './post.service.js';
import { postController } from './post.controller.js';

export function postRoutes(
  service: PostService,
  tokens: TokenService,
  users: UserRepository,
) {
  const router = Router();
  router.post(
    '/',
    authenticate(tokens, users),
    validateBody(createPostSchema),
    postController(service).create,
  );
  return router;
}
