import type { RequestHandler } from 'express';
import type { AuthService } from './auth.service.js';

export function authController(service: AuthService) {
  const register: RequestHandler = async (request, response) => {
    const result = await service.register(request.body);
    response.status(201).json(result);
  };

  const login: RequestHandler = async (request, response) => {
    response.status(200).json(await service.login(request.body));
  };

  return { register, login };
}
