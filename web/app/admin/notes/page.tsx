import Link from 'next/link';
import { api, requireToken } from '@/lib/api';
import type { Note, Page } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const limit = 20;
type Search = Promise<{ page?: string; userId?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminNotesPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const query = await searchParams;
  const page = pageNumber(query.page);
  const userId = query.userId?.trim() ?? '';
  const token = await requireToken();
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (userId) params.set('userId', userId);
  const result = await api<Page<Note>>(`/admin/notes?${params}`, { token });
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Notes</h1>
        <p className="text-muted-foreground">
          Browse notes across all accounts.
        </p>
      </header>
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border p-4"
        action="/admin/notes"
      >
        <div className="w-full max-w-sm space-y-2">
          <Label htmlFor="userId">Filter by user ID</Label>
          <Input
            id="userId"
            name="userId"
            defaultValue={userId}
            placeholder="24-character user ID"
            pattern="[0-9a-fA-F]{24}"
          />
        </div>
        <Button type="submit">Apply filter</Button>
        {userId && (
          <Link
            className="px-2 py-2 text-sm underline-offset-4 hover:underline"
            href="/admin/notes"
          >
            Clear
          </Link>
        )}
      </form>
      <p className="text-sm text-muted-foreground">{result.meta.total} notes</p>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Owner ID</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Content</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((note) => (
              <TableRow key={note.id}>
                <TableCell className="max-w-56 truncate font-medium">
                  {note.title}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {note.owner}
                </TableCell>
                <TableCell>
                  {new Date(note.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="max-w-sm truncate text-muted-foreground">
                  {note.content}
                </TableCell>
              </TableRow>
            ))}
            {!result.data.length && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No notes match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={result.meta.page}
        totalPages={result.meta.totalPages}
        userId={userId}
      />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  userId,
}: {
  page: number;
  totalPages: number;
  userId: string;
}) {
  const href = (target: number) =>
    `/admin/notes?${new URLSearchParams({ page: String(target), ...(userId ? { userId } : {}) })}`;
  return (
    <nav
      aria-label="Note pages"
      className="flex items-center justify-between border-t pt-4 text-sm"
    >
      {page > 1 ? (
        <Link
          className="underline-offset-4 hover:underline"
          href={href(page - 1)}
        >
          Previous
        </Link>
      ) : (
        <span className="text-muted-foreground">Previous</span>
      )}
      <span className="text-muted-foreground">
        Page {page} of {totalPages || 1}
      </span>
      {page < totalPages ? (
        <Link
          className="underline-offset-4 hover:underline"
          href={href(page + 1)}
        >
          Next
        </Link>
      ) : (
        <span className="text-muted-foreground">Next</span>
      )}
    </nav>
  );
}
