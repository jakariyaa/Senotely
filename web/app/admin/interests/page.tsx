import Link from 'next/link';
import { api, requireToken } from '@/lib/api';
import type { InterestGroup, Page } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const limit = 20;
type Search = Promise<{ page?: string; interest?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminInterestsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const query = await searchParams;
  const page = pageNumber(query.page);
  const interest = query.interest?.trim() ?? '';
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (interest) params.set('interest', interest);
  const token = await requireToken();
  const result = await api<Page<InterestGroup>>(
    `/users/by-interests?${params}`,
    { token },
  );
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Interests</h1>
        <p className="text-muted-foreground">
          See which users share each interest.
        </p>
      </header>
      <form
        className="flex flex-wrap items-end gap-3 rounded-xl border p-4"
        action="/admin/interests"
      >
        <div className="w-full max-w-sm space-y-2">
          <Label htmlFor="interest">Filter by interest</Label>
          <Input
            id="interest"
            name="interest"
            defaultValue={interest}
            placeholder="For example, reading"
            maxLength={30}
          />
        </div>
        <Button type="submit">Apply filter</Button>
        {interest && (
          <Link
            className="px-2 py-2 text-sm underline-offset-4 hover:underline"
            href="/admin/interests"
          >
            Clear
          </Link>
        )}
      </form>
      <section
        aria-label="Interest groups"
        className="divide-y rounded-xl border"
      >
        {result.data.map((group) => (
          <article key={group.interest} className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold capitalize">
                {group.interest}
              </h2>
              <p className="text-sm text-muted-foreground">
                {group.count} {group.count === 1 ? 'user' : 'users'}
              </p>
            </div>
            <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.users.map((user) => (
                <li key={user._id} className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {user.email}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        ))}
        {!result.data.length && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No matching interests found.
          </p>
        )}
      </section>
      <Pagination
        page={result.meta.page}
        totalPages={result.meta.totalPages}
        interest={interest}
      />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  interest,
}: {
  page: number;
  totalPages: number;
  interest: string;
}) {
  const href = (target: number) =>
    `/admin/interests?${new URLSearchParams({ page: String(target), ...(interest ? { interest } : {}) })}`;
  return (
    <nav
      aria-label="Interest pages"
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
