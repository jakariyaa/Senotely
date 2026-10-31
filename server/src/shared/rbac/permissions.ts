import type { Role } from './roles.js';

const USER_PERMISSIONS = [
  'note:create',
  'note:read:own',
  'note:update:own',
  'note:delete:own',
] as const;

export type Permission =
  | (typeof USER_PERMISSIONS)[number]
  | 'note:read:any'
  | 'user:create'
  | 'user:read'
  | 'user:update'
  | 'user:delete'
  | 'user:list'
  | 'user:group-by-interest';

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  user: new Set(USER_PERMISSIONS),
  admin: new Set<Permission>([
    ...USER_PERMISSIONS,
    'note:read:any',
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:list',
    'user:group-by-interest',
  ]),
};
