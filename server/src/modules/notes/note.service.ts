import { NotFoundError } from '../../shared/errors/AppError.js';
import { ROLE_PERMISSIONS } from '../../shared/rbac/permissions.js';
import type { Pagination } from '../../shared/pagination/pagination.js';
import type { NoteRepository } from './note.repository.js';
import type { CreateNoteInput, UpdateNoteInput } from './note.schemas.js';
import type { Role } from '../../shared/rbac/roles.js';

type Actor = { id: string; role: Role };

export class NoteService {
  constructor(private readonly notes: NoteRepository) {}

  async listOwn(owner: string, pagination: Pagination) {
    return this.notes.listByOwner(owner, pagination);
  }

  create(owner: string, input: CreateNoteInput) {
    return this.notes.create(owner, input);
  }

  async getById(actor: Actor, id: string) {
    const note = ROLE_PERMISSIONS[actor.role].has('note:read:any')
      ? await this.notes.findAnyById(id)
      : await this.notes.findOwnById(id, actor.id);
    if (!note) {
      throw new NotFoundError('Note not found');
    }
    return note;
  }

  async updateOwn(actor: Actor, id: string, input: UpdateNoteInput) {
    const note = await this.notes.updateOwn(id, actor.id, input);
    if (!note) {
      throw new NotFoundError('Note not found');
    }
    return note;
  }

  async deleteOwn(actor: Actor, id: string): Promise<void> {
    if (!(await this.notes.deleteOwn(id, actor.id))) {
      throw new NotFoundError('Note not found');
    }
  }

  listAll(owner: string | undefined, pagination: Pagination) {
    return this.notes.listAll(owner, pagination);
  }
}
