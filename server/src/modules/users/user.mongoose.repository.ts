import { UserModel } from './user.model.js';
import type {
  AuthUser,
  PublicUser,
  UserRepository,
} from './user.repository.js';
import type { Role } from '../../shared/rbac/roles.js';
import type { Pagination } from '../../shared/pagination/pagination.js';
import type { ManagedUserInput, ManagedUserUpdate } from './user.repository.js';

const publicProjection = '_id name email role interests';

function toPublicUser(user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  interests: string[];
}): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    interests: user.interests,
  };
}

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
    const user = await UserModel.findById(id).select(publicProjection).lean();
    return user ? toPublicUser(user) : null;
  }

  async create(
    input: Pick<AuthUser, 'name' | 'email' | 'passwordHash'>,
  ): Promise<PublicUser> {
    const user = await UserModel.create({ ...input, role: 'user' });
    return toPublicUser(user);
  }

  async createManaged(input: ManagedUserInput): Promise<PublicUser> {
    return toPublicUser(await UserModel.create(input));
  }

  async list(
    pagination: Pagination,
  ): Promise<{ data: PublicUser[]; total: number }> {
    const [users, total] = await Promise.all([
      UserModel.find()
        .sort({ _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .select(publicProjection)
        .lean(),
      UserModel.estimatedDocumentCount(),
    ]);
    return { data: users.map(toPublicUser), total };
  }

  async updateById(
    id: string,
    input: ManagedUserUpdate,
  ): Promise<PublicUser | null> {
    const user = await UserModel.findByIdAndUpdate(
      id,
      { $set: input },
      {
        returnDocument: 'after',
        runValidators: true,
        projection: publicProjection,
      },
    ).lean();
    return user ? toPublicUser(user) : null;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await UserModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }
}
