import { Router } from 'express';
import type { TokenService } from '../../shared/security/TokenService.js';
import type { UserRepository } from '../users/user.repository.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { createNoteSchema, updateNoteSchema } from './note.schemas.js';
import type { NoteService } from './note.service.js';
import { noteController } from './note.controller.js';

export function noteRoutes(
  service: NoteService,
  tokens: TokenService,
  users: UserRepository,
) {
  const router = Router();
  const controller = noteController(service);
  router.use(authenticate(tokens, users));
  router.get('/', authorize('note:read:own'), controller.listOwn);
  router.post(
    '/',
    authorize('note:create'),
    validateBody(createNoteSchema),
    controller.create,
  );
  router.get('/:id', controller.getById);
  router.patch(
    '/:id',
    authorize('note:update:own'),
    validateBody(updateNoteSchema),
    controller.update,
  );
  router.delete('/:id', authorize('note:delete:own'), controller.remove);
  return router;
}

export function adminNoteRoutes(
  service: NoteService,
  tokens: TokenService,
  users: UserRepository,
) {
  const router = Router();
  router.get(
    '/',
    authenticate(tokens, users),
    authorize('note:read:any'),
    noteController(service).listAll,
  );
  return router;
}
