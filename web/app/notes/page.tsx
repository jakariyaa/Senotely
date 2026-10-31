import Link from 'next/link';
import { api, requireToken, requireUser } from '@/lib/api';
import type { Note, Page } from '@/lib/types';
import { CreateNoteDialog, NoteCard } from '@/components/note-forms';

const limit = 20;

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireUser();
  const query = await searchParams;
  const requestedPage = Number(query.page);
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const token = await requireToken();
  const result = await api<Page<Note>>(`/notes?page=${page}&limit=${limit}`, {
    token,
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Your private notebook</p>
          <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
        </div>
        <CreateNoteDialog />
      </header>
      <section
        aria-label="Your notes"
        className="rounded-xl border bg-card px-5 sm:px-7"
      >
        {result.data.length ? (
          result.data.map((note) => <NoteCard key={note.id} note={note} />)
        ) : (
          <div className="py-16 text-center">
            <h2 className="text-lg font-medium">Nothing on this page yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Save your first note to start filling the margins.
            </p>
          </div>
        )}
      </section>
      <nav
        aria-label="Note pages"
        className="flex items-center justify-between border-t pt-4 text-sm"
      >
        {result.meta.page > 1 ? (
          <Link
            className="nav-link"
            href={`/notes?page=${result.meta.page - 1}`}
          >
            Previous
          </Link>
        ) : (
          <span className="text-muted-foreground">Previous</span>
        )}
        <span className="text-muted-foreground">
          Page {result.meta.page} of {result.meta.totalPages || 1}
        </span>
        {result.meta.page < result.meta.totalPages ? (
          <Link
            className="nav-link"
            href={`/notes?page=${result.meta.page + 1}`}
          >
            Next
          </Link>
        ) : (
          <span className="text-muted-foreground">Next</span>
        )}
      </nav>
    </div>
  );
}
