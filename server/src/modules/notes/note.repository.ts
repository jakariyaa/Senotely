import type { Pagination } from '../../shared/pagination/pagination.js';

export type NoteData = {
  id: string;
  owner: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteInput = { title: string; content: string };

export interface NoteRepository {
  create(owner: string, input: NoteInput): Promise<NoteData>;
  findOwnById(id: string, owner: string): Promise<NoteData | null>;
  findAnyById(id: string): Promise<NoteData | null>;
  updateOwn(
    id: string,
    owner: string,
    input: Partial<NoteInput>,
  ): Promise<NoteData | null>;
  deleteOwn(id: string, owner: string): Promise<boolean>;
  deleteByOwner(owner: string): Promise<void>;
  listByOwner(
    owner: string,
    pagination: Pagination,
  ): Promise<{ data: NoteData[]; total: number }>;
  listAll(
    owner: string | undefined,
    pagination: Pagination,
  ): Promise<{ data: NoteData[]; total: number }>;
}
