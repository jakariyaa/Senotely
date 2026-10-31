import { Router } from 'express';
import type { AuthService } from '../auth/auth.service.js';
import type { TokenService } from '../../shared/security/TokenService.js';
import type { UserRepository } from './user.repository.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { userController } from './user.controller.js';
import { userAdminController } from './user.admin.controller.js';
import {
  createManagedUserSchema,
  updateManagedUserSchema,
} from './user.schemas.js';
import type { UserService } from './user.service.js';
import type { PostService } from '../posts/post.service.js';
import { postController } from '../posts/post.controller.js';

export function userRoutes(
  service: AuthService,
  tokens: TokenService,
  users: UserRepository,
  userService: UserService,
  postService: PostService,
): Router {
  const router = Router();
  router.get('/me', authenticate(tokens, users), userController(service).me);
  router.get('/:id/posts', postController(postService).findByAuthor);
  router.use(authenticate(tokens, users));

  const admin = userAdminController(userService);
  router.get('/', authorize('user:list'), admin.list);
  router.post(
    '/',
    authorize('user:create'),
    validateBody(createManagedUserSchema),
    admin.create,
  );
  router.get(
    '/by-interests',
    authorize('user:group-by-interest'),
    admin.groupByInterests,
  );
  router.get('/:id', authorize('user:read'), admin.get);
  router.patch(
    '/:id',
    authorize('user:update'),
    validateBody(updateManagedUserSchema),
    admin.update,
  );
  router.delete('/:id', authorize('user:delete'), admin.remove);
  return router;
}
