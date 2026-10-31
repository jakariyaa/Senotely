import { model, Schema, type InferSchemaType } from 'mongoose';

const postSchema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 10000 },
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

postSchema.index({ author: 1, _id: -1 });

export type Post = InferSchemaType<typeof postSchema>;
export const PostModel = model('Post', postSchema);
