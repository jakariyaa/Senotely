import { model, Schema, type InferSchemaType } from 'mongoose';

const noteSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

noteSchema.index({ owner: 1, _id: -1 });

export type Note = InferSchemaType<typeof noteSchema>;
export const NoteModel = model('Note', noteSchema);
