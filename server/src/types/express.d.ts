import type { Role } from '../shared/rbac/roles.js';

declare global {
  namespace Express {
    interface Request {
      actor?: { id: string; role: Role };
    }
  }
}

export {};
