import type { Role } from '../../shared/rbac/roles.js';
import type { Pagination } from '../../shared/pagination/pagination.js';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  interests: string[];
};

export type PublicUser = Omit<AuthUser, 'passwordHash'>;
export type ManagedUserInput = Pick<
  AuthUser,
  'name' | 'email' | 'passwordHash' | 'role' | 'interests'
>;
export type ManagedUserUpdate = Partial<ManagedUserInput>;
export type InterestGroup = {
  interest: string;
  count: number;
  users: Array<{ _id: string; name: string; email: string }>;
};

export interface UserRepository {
  findAuthByEmail(email: string): Promise<AuthUser | null>;
  findActorById(id: string): Promise<Pick<AuthUser, 'id' | 'role'> | null>;
  findPublicById(id: string): Promise<PublicUser | null>;
  create(
    input: Pick<AuthUser, 'name' | 'email' | 'passwordHash'>,
  ): Promise<PublicUser>;
  createManaged(input: ManagedUserInput): Promise<PublicUser>;
  list(pagination: Pagination): Promise<{ data: PublicUser[]; total: number }>;
  updateById(id: string, input: ManagedUserUpdate): Promise<PublicUser | null>;
  deleteById(id: string): Promise<boolean>;
  groupByInterests(input: {
    interest?: string;
    page: number;
    limit: number;
    usersPerGroup: number;
  }): Promise<{ items: InterestGroup[]; total: number }>;
}
