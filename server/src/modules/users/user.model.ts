import { model, Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    interests: {
      type: [String],
      default: [],
      set: (values: string[]) => [
        ...new Set(values.map((value) => value.trim().toLowerCase())),
      ],
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: {
      transform: (_document, returned) => {
        const safe = { ...returned } as Record<string, unknown>;
        delete safe.__v;
        delete safe.passwordHash;
        return safe;
      },
    },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ interests: 1 });

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
