import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProfilePostForm from '@/components/profile-post-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, ApiError, getCurrentUser, getToken } from '@/lib/api';
import type { ApiUserPosts, User } from '@/lib/types';

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[\da-f]{24}$/i.test(id)) notFound();
  const parsedPage = Number(query.page);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const token = await getToken();
  let result: ApiUserPosts;
  let currentUser: User | null;
  try {
    [result, currentUser] = await Promise.all([
      api<ApiUserPosts>(
        `/users/${encodeURIComponent(id)}/posts?page=${page}&limit=10`,
        {
          ...(token ? { token } : {}),
        },
      ),
      getCurrentUser(),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  if (!result.data.user) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">Public profile</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {result.data.user.name}
        </h1>
      </header>

      {currentUser?.id.toLowerCase() === id.toLowerCase() && (
        <ProfilePostForm profileId={id} />
      )}

      <section className="space-y-4" aria-labelledby="posts-heading">
        <h2 id="posts-heading" className="text-xl font-semibold">
          Posts
        </h2>
        {result.data.posts.length ? (
          <div className="space-y-4">
            {result.data.posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <CardTitle>{post.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {result.data.user.name} ·{' '}
                    <time dateTime={post.createdAt}>
                      {new Date(post.createdAt).toLocaleDateString()}
                    </time>
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{post.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No posts yet.</p>
        )}
      </section>

      <nav aria-label="Post pages" className="flex justify-between">
        {page > 1 ? (
          <Link href={`/users/${encodeURIComponent(id)}?page=${page - 1}`}>
            Previous
          </Link>
        ) : (
          <span />
        )}
        {result.meta.hasNextPage && (
          <Link href={`/users/${encodeURIComponent(id)}?page=${page + 1}`}>
            Next
          </Link>
        )}
      </nav>
    </div>
  );
}
