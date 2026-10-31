import Link from 'next/link';
import { getCurrentUser } from '@/lib/api';
import { logout } from '@/lib/actions';
import { Button } from '@/components/ui/button';

export async function AppNav() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <header className="border-b bg-card">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Margin <span className="text-primary">/</span> Notes
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {user ? (
            <>
              <Link className="nav-link" href="/notes">
                My notes
              </Link>
              <Link className="nav-link" href={`/users/${user.id}`}>
                Public posts
              </Link>
              {user.role === 'admin' && (
                <Link className="nav-link" href="/admin/users">
                  Admin
                </Link>
              )}
              <span className="hidden text-muted-foreground sm:inline">
                {user.name}
              </span>
              <form action={logout}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link className="nav-link" href="/login">
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link href="/register">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
