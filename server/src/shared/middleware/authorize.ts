import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import type { Permission } from '../rbac/permissions.js';
import { ROLE_PERMISSIONS } from '../rbac/permissions.js';

export function authorize(permission: Permission): RequestHandler {
  return (request, _response, next) => {
    const actor = request.actor;
    if (!actor) {
      next(new UnauthorizedError());
      return;
    }
    if (!ROLE_PERMISSIONS[actor.role].has(permission)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
