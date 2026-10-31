'use client';

import { useActionState } from 'react';
import { createNote, deleteNote, updateNote } from '@/lib/actions';
import { emptyActionState, type Note } from '@/lib/types';
import { ActionFeedback } from '@/components/action-feedback';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

function NoteEditor({ note }: { note?: Note }) {
  const action = note ? updateNote.bind(null, note.id) : createNote;
  const [state, formAction] = useActionState(action, emptyActionState);
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`title-${note?.id ?? 'new'}`}>Title</Label>
        <Input
          id={`title-${note?.id ?? 'new'}`}
          name="title"
          defaultValue={note?.title}
          required
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`content-${note?.id ?? 'new'}`}>Note</Label>
        <Textarea
          id={`content-${note?.id ?? 'new'}`}
          name="content"
          defaultValue={note?.content}
          required
          maxLength={10000}
          rows={7}
        />
      </div>
      <ActionFeedback state={state} />
      <SubmitButton>{note ? 'Save changes' : 'Save note'}</SubmitButton>
    </form>
  );
}

export function CreateNoteDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New note</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write a note</DialogTitle>
          <DialogDescription>Only you can read this note.</DialogDescription>
        </DialogHeader>
        <NoteEditor />
      </DialogContent>
    </Dialog>
  );
}

export function NoteCard({ note }: { note: Note }) {
  const [state, action] = useActionState(
    deleteNote.bind(null, note.id),
    emptyActionState,
  );
  return (
    <article className="border-t py-5 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-semibold">{note.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Updated{' '}
            <time dateTime={note.updatedAt}>
              {new Date(note.updatedAt).toLocaleDateString()}
            </time>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit note</DialogTitle>
              </DialogHeader>
              <NoteEditor note={note} />
            </DialogContent>
          </Dialog>
          <form
            action={action}
            onSubmit={(event) => {
              if (!window.confirm(`Delete “${note.title}”?`))
                event.preventDefault();
            }}
          >
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </form>
        </div>
      </div>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
        {note.content}
      </p>
      <ActionFeedback state={state} />
    </article>
  );
}
