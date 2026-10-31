import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import type { TokenService } from './TokenService.js';

export class JwtTokenService implements TokenService {
  sign(userId: string): string {
    return jwt.sign({ sub: userId }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN as NonNullable<SignOptions['expiresIn']>,
    });
  }

  verify(token: string): string | null {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      });
      return typeof payload !== 'string' &&
        typeof payload.sub === 'string' &&
        /^[\da-f]{24}$/i.test(payload.sub)
        ? payload.sub
        : null;
    } catch {
      return null;
    }
  }
}
