import type { RequestHandler } from 'express';
import {
  UnauthorizedError,
  ValidationError,
} from '../../shared/errors/AppError.js';
import {
  buildMeta,
  parsePagination,
} from '../../shared/pagination/pagination.js';
import { interestGroupsQuerySchema, userIdSchema } from './user.schemas.js';
import type { UserService } from './user.service.js';

export function userAdminController(service: UserService) {
  const list: RequestHandler = async (request, response) => {
    const pagination = parsePagination(request.query);
    const result = await service.list(pagination);
    response.json({
      data: result.data,
      meta: buildMeta(result.total, pagination.page, pagination.limit),
    });
  };

  const create: RequestHandler = async (request, response) => {
    response.status(201).json(await service.create(request.body));
  };

  const get: RequestHandler = async (request, response) => {
    const id = userIdSchema.safeParse(request.params.id);
    if (!id.success) throw new ValidationError('Invalid user id');
    response.json(await service.get(id.data));
  };

  const update: RequestHandler = async (request, response) => {
    if (!request.actor) throw new UnauthorizedError();
    const id = userIdSchema.safeParse(request.params.id);
    if (!id.success) throw new ValidationError('Invalid user id');
    response.json(
      await service.update(request.actor.id, id.data, request.body),
    );
  };

  const remove: RequestHandler = async (request, response) => {
    if (!request.actor) throw new UnauthorizedError();
    const id = userIdSchema.safeParse(request.params.id);
    if (!id.success) throw new ValidationError('Invalid user id');
    await service.delete(request.actor.id, id.data);
    response.status(204).end();
  };

  const groupByInterests: RequestHandler = async (request, response) => {
    const parsed = interestGroupsQuerySchema.safeParse(request.query);
    if (!parsed.success)
      throw new ValidationError('Invalid interest group query');
    const pagination = parsePagination(parsed.data);
    const result = await service.groupByInterests({
      ...(parsed.data.interest ? { interest: parsed.data.interest } : {}),
      page: pagination.page,
      limit: pagination.limit,
    });
    response.json({
      data: result.items,
      meta: buildMeta(result.total, pagination.page, pagination.limit),
    });
  };

  return { list, create, get, update, remove, groupByInterests };
}
