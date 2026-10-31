import type { PasswordHasher } from '../../shared/security/PasswordHasher.js';
import type { TokenService } from '../../shared/security/TokenService.js';
import {
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors/AppError.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import type { PublicUser, UserRepository } from '../users/user.repository.js';

const DUMMY_PASSWORD_HASH =
  '$2b$12$LGQvDDp5IWfF2Rv1faIZ0ODU8VkLIWpGRtVyeRxosMTZt3E07kFze';

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async register(
    input: RegisterInput,
  ): Promise<{ token: string; user: PublicUser }> {
    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
    return { token: this.tokens.sign(user.id), user };
  }

  async login(input: LoginInput): Promise<{ token: string; user: PublicUser }> {
    const user = await this.users.findAuthByEmail(input.email);
    const isValid = await this.passwords.verify(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      interests: user.interests,
    };
    return { token: this.tokens.sign(user.id), user: publicUser };
  }

  async getCurrentUser(userId: string): Promise<PublicUser> {
    const user = await this.users.findPublicById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }
}
