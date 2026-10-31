import { model, Schema, Types } from 'mongoose';

export type Post = {
  author: Types.ObjectId;
  title: string;
  content: string;
};

const postSchema = new Schema<Post>(
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

export const PostModel = model<Post>('Post', postSchema);
