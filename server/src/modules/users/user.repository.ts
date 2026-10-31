import type { Role } from '../../shared/rbac/roles.js';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  interests: string[];
};

export type PublicUser = Omit<AuthUser, 'passwordHash'>;

export interface UserRepository {
  findAuthByEmail(email: string): Promise<AuthUser | null>;
  findActorById(id: string): Promise<Pick<AuthUser, 'id' | 'role'> | null>;
  findPublicById(id: string): Promise<PublicUser | null>;
  create(
    input: Pick<AuthUser, 'name' | 'email' | 'passwordHash'>,
  ): Promise<PublicUser>;
}
