import type { Pagination } from '../../shared/pagination/pagination.js';
import { NoteModel } from './note.model.js';
import type { NoteData, NoteInput, NoteRepository } from './note.repository.js';

type StoredNote = {
  _id: { toString(): string };
  owner: { toString(): string };
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

function toNoteData(note: StoredNote): NoteData {
  return {
    id: note._id.toString(),
    owner: note.owner.toString(),
    title: note.title,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

const projection = '_id owner title content createdAt updatedAt';

export class MongooseNoteRepository implements NoteRepository {
  async create(owner: string, input: NoteInput): Promise<NoteData> {
    const note = await NoteModel.create({ owner, ...input });
    return toNoteData(note as unknown as StoredNote);
  }

  async findOwnById(id: string, owner: string): Promise<NoteData | null> {
    const note = await NoteModel.findOne({ _id: id, owner })
      .select(projection)
      .lean();
    return note ? toNoteData(note as unknown as StoredNote) : null;
  }

  async findAnyById(id: string): Promise<NoteData | null> {
    const note = await NoteModel.findById(id).select(projection).lean();
    return note ? toNoteData(note as unknown as StoredNote) : null;
  }

  async updateOwn(
    id: string,
    owner: string,
    input: Partial<NoteInput>,
  ): Promise<NoteData | null> {
    const note = await NoteModel.findOneAndUpdate(
      { _id: id, owner },
      { $set: input },
      { new: true, runValidators: true, projection },
    ).lean();
    return note ? toNoteData(note as unknown as StoredNote) : null;
  }

  async deleteOwn(id: string, owner: string): Promise<boolean> {
    const result = await NoteModel.deleteOne({ _id: id, owner });
    return result.deletedCount === 1;
  }

  async listByOwner(
    owner: string,
    pagination: Pagination,
  ): Promise<{ data: NoteData[]; total: number }> {
    const [notes, total] = await Promise.all([
      NoteModel.find({ owner })
        .sort({ _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .select(projection)
        .lean(),
      NoteModel.countDocuments({ owner }),
    ]);
    return {
      data: notes.map((note) => toNoteData(note as unknown as StoredNote)),
      total,
    };
  }

  async listAll(
    owner: string | undefined,
    pagination: Pagination,
  ): Promise<{ data: NoteData[]; total: number }> {
    const filter = owner ? { owner } : {};
    const [notes, total] = await Promise.all([
      NoteModel.find(filter)
        .sort({ _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .select(projection)
        .lean(),
      owner
        ? NoteModel.countDocuments({ owner })
        : NoteModel.estimatedDocumentCount(),
    ]);
    return {
      data: notes.map((note) => toNoteData(note as unknown as StoredNote)),
      total,
    };
  }
}
