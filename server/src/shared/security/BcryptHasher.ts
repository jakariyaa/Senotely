import bcrypt from 'bcryptjs';
import type { PasswordHasher } from './PasswordHasher.js';

export class BcryptHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
