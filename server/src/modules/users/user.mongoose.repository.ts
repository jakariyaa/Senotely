import { UserModel } from './user.model.js';
import type {
  AuthUser,
  PublicUser,
  UserRepository,
} from './user.repository.js';
import type { Role } from '../../shared/rbac/roles.js';

export class MongooseUserRepository implements UserRepository {
  async findAuthByEmail(email: string): Promise<AuthUser | null> {
    const user = await UserModel.findOne({ email })
      .select('+passwordHash')
      .lean();
    return user
      ? {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role as Role,
          interests: user.interests,
        }
      : null;
  }

  async findActorById(
    id: string,
  ): Promise<Pick<AuthUser, 'id' | 'role'> | null> {
    const user = await UserModel.findById(id).select('_id role').lean();
    return user ? { id: user._id.toString(), role: user.role as Role } : null;
  }

  async findPublicById(id: string): Promise<PublicUser | null> {
    const user = await UserModel.findById(id)
      .select('-passwordHash -__v')
      .lean();
    return user
      ? {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role as Role,
          interests: user.interests,
        }
      : null;
  }

  async create(
    input: Pick<AuthUser, 'name' | 'email' | 'passwordHash'>,
  ): Promise<PublicUser> {
    const user = await UserModel.create({ ...input, role: 'user' });
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role as Role,
      interests: user.interests,
    };
  }
}
