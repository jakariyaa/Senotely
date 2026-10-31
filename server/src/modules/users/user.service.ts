import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/AppError.js';
import type { PasswordHasher } from '../../shared/security/PasswordHasher.js';
import type { Pagination } from '../../shared/pagination/pagination.js';
import type { NoteRepository } from '../notes/note.repository.js';
import type { PostRepository } from '../posts/post.repository.js';
import type { UserRepository } from './user.repository.js';
import type {
  CreateManagedUserInput,
  UpdateManagedUserInput,
} from './user.schemas.js';

export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly notes: NoteRepository,
    private readonly posts: PostRepository,
  ) {}

  list(pagination: Pagination) {
    return this.users.list(pagination);
  }

  async get(id: string) {
    const user = await this.users.findPublicById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async create(input: CreateManagedUserInput) {
    const passwordHash = await this.passwords.hash(input.password);
    try {
      return await this.users.createManaged({
        name: input.name,
        email: input.email,
        role: input.role,
        interests: input.interests,
        passwordHash,
      });
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError('Email already exists');
      throw error;
    }
  }

  async update(actorId: string, id: string, input: UpdateManagedUserInput) {
    if (actorId === id && input.role !== undefined) {
      throw new ForbiddenError('You cannot change your own role');
    }

    const { password, ...fields } = input;
    const updated = await this.users.updateById(id, {
      ...fields,
      ...(password
        ? { passwordHash: await this.passwords.hash(password) }
        : {}),
    });
    if (!updated) throw new NotFoundError('User not found');
    return updated;
  }

  async delete(actorId: string, id: string): Promise<void> {
    if (actorId === id) {
      throw new ForbiddenError('You cannot delete your own account');
    }
    if (!(await this.users.findPublicById(id))) {
      throw new NotFoundError('User not found');
    }

    await this.notes.deleteByOwner(id);
    await this.posts.deleteByAuthor(id);
    if (!(await this.users.deleteById(id))) {
      throw new NotFoundError('User not found');
    }
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}
