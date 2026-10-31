import type { RequestHandler } from 'express';
import {
  UnauthorizedError,
  ValidationError,
} from '../../shared/errors/AppError.js';
import {
  buildMeta,
  parsePagination,
} from '../../shared/pagination/pagination.js';
import { adminNotesQuerySchema, noteIdSchema } from './note.schemas.js';
import type { NoteService } from './note.service.js';

export function noteController(service: NoteService) {
  const listOwn: RequestHandler = async (request, response) => {
    if (!request.actor) throw new UnauthorizedError();
    const pagination = parsePagination(request.query);
    const result = await service.listOwn(request.actor.id, pagination);
    response.json({
      data: result.data,
      meta: buildMeta(result.total, pagination.page, pagination.limit),
    });
  };

  const create: RequestHandler = async (request, response) => {
    if (!request.actor) throw new UnauthorizedError();
    response
      .status(201)
      .json(await service.create(request.actor.id, request.body));
  };

  const getById: RequestHandler = async (request, response) => {
    if (!request.actor) throw new UnauthorizedError();
    const id = noteIdSchema.safeParse(request.params.id);
    if (!id.success) throw new ValidationError('Invalid note id');
    response.json(await service.getById(request.actor, id.data));
  };

  const update: RequestHandler = async (request, response) => {
    if (!request.actor) throw new UnauthorizedError();
    const id = noteIdSchema.safeParse(request.params.id);
    if (!id.success) throw new ValidationError('Invalid note id');
    response.json(
      await service.updateOwn(request.actor, id.data, request.body),
    );
  };

  const remove: RequestHandler = async (request, response) => {
    if (!request.actor) throw new UnauthorizedError();
    const id = noteIdSchema.safeParse(request.params.id);
    if (!id.success) throw new ValidationError('Invalid note id');
    await service.deleteOwn(request.actor, id.data);
    response.status(204).end();
  };

  const listAll: RequestHandler = async (request, response) => {
    const parsed = adminNotesQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new ValidationError('Invalid admin notes query');
    const pagination = parsePagination(parsed.data);
    const result = await service.listAll(parsed.data.userId, pagination);
    response.json({
      data: result.data,
      meta: buildMeta(result.total, pagination.page, pagination.limit),
    });
  };

  return { listOwn, create, getById, update, remove, listAll };
}
