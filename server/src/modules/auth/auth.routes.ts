import { Router } from 'express';
import type { AuthService } from './auth.service.js';
import { authController } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import { validateBody } from '../../shared/middleware/validate.js';

export function authRoutes(service: AuthService): Router {
  const router = Router();
  const controller = authController(service);

  router.post('/register', validateBody(registerSchema), controller.register);
  router.post('/login', validateBody(loginSchema), controller.login);

  return router;
}
