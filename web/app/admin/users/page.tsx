import Link from 'next/link';
import { api, requireToken } from '@/lib/api';
import type { Page, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CreateManagedUserForm,
  ManagedUserRow,
} from '@/components/admin-user-forms';

const limit = 20;
type Search = Promise<{ page?: string }>;

function pageNumber(value?: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const page = pageNumber((await searchParams).page);
  const token = await requireToken();
  const result = await api<Page<User>>(`/users?page=${page}&limit=${limit}`, {
    token,
  });
  const { meta } = result;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Manage accounts, roles, and interests.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Create a user</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateManagedUserForm />
        </CardContent>
      </Card>
      <section aria-labelledby="user-list-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="user-list-heading" className="text-xl font-semibold">
              All users
            </h2>
            <p className="text-sm text-muted-foreground">
              {meta.total} accounts
            </p>
          </div>
        </div>
        <Card className="px-4 sm:px-6">
          <CardContent className="px-0">
            {result.data.length ? (
              result.data.map((user) => (
                <ManagedUserRow key={user.id} user={user} />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No users found.
              </p>
            )}
          </CardContent>
        </Card>
        <Pagination page={meta.page} totalPages={meta.totalPages} />
      </section>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  return (
    <nav
      aria-label="User pages"
      className="flex items-center justify-between border-t pt-4 text-sm"
    >
      {page > 1 ? (
        <Link
          className="rounded underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={`/admin/users?page=${page - 1}`}
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
          className="rounded underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={`/admin/users?page=${page + 1}`}
        >
          Next
        </Link>
      ) : (
        <span className="text-muted-foreground">Next</span>
      )}
    </nav>
  );
}
