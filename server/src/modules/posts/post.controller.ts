import type { RequestHandler } from 'express';
import {
  UnauthorizedError,
  ValidationError,
} from '../../shared/errors/AppError.js';
import { parsePagination } from '../../shared/pagination/pagination.js';
import { postAuthorIdSchema } from './post.schemas.js';
import type { PostService } from './post.service.js';

export function postController(service: PostService) {
  const create: RequestHandler = async (request, response) => {
    if (!request.actor) throw new UnauthorizedError();
    response
      .status(201)
      .json(await service.create(request.actor.id, request.body));
  };

  const findByAuthor: RequestHandler = async (request, response) => {
    const userId = postAuthorIdSchema.safeParse(request.params.id);
    if (!userId.success) throw new ValidationError('Invalid user id');
    const pagination = parsePagination(request.query);
    const result = await service.findByAuthor({
      userId: userId.data,
      ...pagination,
    });
    response.json({
      data: { user: result.user, posts: result.posts },
      meta: result.meta,
    });
  };

  return { create, findByAuthor };
}
