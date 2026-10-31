# Secure Notes Platform

## Development

Requirements: Node.js 24+, pnpm, and Docker Compose.

```sh
cp server/.env.example server/.env
cp web/.env.example web/.env.local
docker compose up -d
pnpm install
pnpm seed
pnpm dev
```

In another terminal, run `pnpm dev:web`. The web app listens on port 3000; the API listens on port 3001 and MongoDB is exposed on host port 27018 to avoid colliding with a local MongoDB using the default port. `GET /health` returns `{ "status": "ok" }`. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `server/.env` before seeding. `pnpm seed` replaces only the generated `seed-user-*` records and their notes/posts, then upserts the configured admin. The seed administrator uses those configured credentials.

The web app reads `API_BASE_URL` from `web/.env.local` (defaults to `http://127.0.0.1:3001`). `pnpm build`, `pnpm lint`, and `pnpm typecheck` cover both workspace packages. `pnpm test` runs the server tests.

## Index ledger

Exactly four custom indexes are defined with `schema.index()`:

| Index                                | Serves                                   | Why                                                                                                           |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `users.email` unique                 | Q1 login, Q2 email uniqueness            | Equality lookup and database-enforced uniqueness.                                                             |
| `users.interests`                    | Q13 filtered interest grouping           | Supports the pipeline's initial `$match`. Unfiltered grouping must scan all users.                            |
| `notes.owner, notes._id` descending  | Q5/Q7 owner lists, Q9 count, Q10 cascade | Owner equality with newest-first `_id` ordering; the compound index prefix also covers owner-only operations. |
| `posts.author, posts._id` descending | Q11 cascade, Q12 public posts lookup     | Author equality with newest-first ordering inside `$lookup`; the author prefix supports cascade deletion.     |

Lists sort by `_id` rather than `createdAt`, so MongoDB's built-in `_id` index handles unfiltered newest-first lists without a `SORT` stage. No `role`, `name`, `createdAt`, `updatedAt`, or `title` indexes are added. Run `pnpm --filter @notes/server verify-indexes` to check the exact set.

## Seed and explain

`pnpm seed` generates one admin, 5,000 users, 50,000 notes, and 20,000 posts. One generated user owns 2,000 notes and posts to exercise paginated lookups. `pnpm explain` checks winning-plan index use for Q1 and Q3–Q13, the `$lookup` index, unexpected in-memory sorts for list queries, and bounded documents examined for Q12. Q2 is a unique constraint rather than a read query, so it has no explain row. Counters are diagnostics except for Q12's page-sized lookup bound.

Results on MongoDB 9.0.4 with the generated dataset:

| Query                          | Index             | docsExamined | keysExamined | nReturned |
| ------------------------------ | ----------------- | -----------: | -----------: | --------: |
| Q1 login                       | `email_1`         |            1 |            1 |         1 |
| Q3 get user by id              | `_id_`            |            1 |            1 |         1 |
| Q4 admin list users            | `_id_`            |           20 |           40 |        20 |
| Q5 notes by owner              | `owner_1__id_-1`  |           20 |           20 |        20 |
| Q6 all notes                   | `_id_`            |           20 |           20 |        20 |
| Q7 admin notes by user         | `owner_1__id_-1`  |           20 |           20 |        20 |
| Q8 note by id and owner        | `_id_`            |            1 |            1 |         1 |
| Q9 count notes by owner        | `owner_1__id_-1`  |            0 |        2,011 |         0 |
| Q10 cascade delete notes       | `owner_1__id_-1`  |        2,010 |        2,010 |         0 |
| Q11 cascade delete posts       | `author_1__id_-1` |        2,003 |        2,003 |         0 |
| Q12 public posts lookup        | `author_1__id_-1` |           21 |           21 |         1 |
| Q13 filtered interest grouping | `interests_1`     |          643 |          643 |       643 |

## Aggregations

- **Scenario 1 — grouped interests (`GET /users/by-interests`)**: one `User.aggregate()` begins with an optional indexed `$match` on `interests`, projects only public group fields, unwinds interests, and groups users with `$topN` capped to 20. A `$facet` paginates groups and counts groups in that same call. Without the filter every user must be read; the interest index cannot avoid that full scan.
- **Scenario 2 — public user posts (`GET /users/:id/posts`)**: one `User.aggregate()` matches the user by `_id`, then `$lookup`s posts by `author`. The posts compound index supports newest-first sorting within the lookup. `$skip`/`$limit` fetch one extra post to calculate `hasNextPage`. The final projection returns only user id/name and posts, never user email or password hash. Both scenarios have tests guarding the one-aggregate-call constraint.

## Security

- Passwords use bcrypt with cost 12; hashes are not returned. Unknown-user login performs a dummy comparison.
- JWTs use HS256 and expire after `JWT_EXPIRES_IN` (default `1h`). `JWT_SECRET` must be at least 32 characters.
- The web app stores the API token only in an `httpOnly`, `sameSite=lax` cookie, `secure` in production. Server actions and server-rendered pages call the API and forward the bearer token; browser JavaScript never receives it.
- The API reloads the actor and role from MongoDB on every protected request. Next.js `proxy.ts` also checks `/users/me` to redirect unauthenticated requests and non-admins from admin pages; API RBAC remains authoritative.
- Note ownership is constrained in API repository queries. The web layer validates form values, but does not replace API validation or authorization.

## API reference

Paginated lists accept `page` (default 1) and `limit` (default 20, maximum 100), and return `{ data, meta: { page, limit, total, totalPages } }`, except public posts, which return `meta.hasNextPage`. Errors use `{ error: { code, message, details? } }`.

| Method                   | Path                  | Access        | Purpose                                                         |
| ------------------------ | --------------------- | ------------- | --------------------------------------------------------------- |
| `POST`                   | `/auth/register`      | Public        | Register a user; role is always `user`.                         |
| `POST`                   | `/auth/login`         | Public        | Login; returns token and user.                                  |
| `GET`                    | `/users/me`           | Authenticated | Current user.                                                   |
| `GET`, `POST`            | `/notes`              | Authenticated | List own notes; create a note.                                  |
| `GET`, `PATCH`, `DELETE` | `/notes/:id`          | Authenticated | Read visible note; update/delete own note only.                 |
| `POST`                   | `/posts`              | Authenticated | Create a post as the current user.                              |
| `GET`                    | `/users/:id/posts`    | Public        | Paginated public posts by author.                               |
| `GET`, `POST`            | `/users`              | Admin         | List users; create managed user.                                |
| `GET`, `PATCH`, `DELETE` | `/users/:id`          | Admin         | Get, update, or delete user; deletion cascades notes and posts. |
| `GET`                    | `/users/by-interests` | Admin         | Paginated groups; optional `interest` filter.                   |
| `GET`                    | `/admin/notes`        | Admin         | Paginated notes; optional `userId` filter.                      |
| `GET`                    | `/health`             | Public        | API health check.                                               |

Admins can read another user's note but cannot edit or delete it. Admins cannot delete themselves or change their own role. Posts are public to read, and grouped interests are admin-only.

## Assumptions

- The pnpm workspace has one API package and one Next.js web package.
- MongoDB is the only service in Compose, pinned to 9.0.4.
- Posts are public to read; the grouped-interests endpoint is admin-only.
- Registration is public and always creates a `user`; the configured seed account is an admin.
- The interests index accelerates filtered grouping; grouping all users necessarily scans the user collection.
- Admins may read other users' notes but may not update or delete them.
- The frontend uses Next.js 16's `proxy.ts` convention for optimistic route redirects; protected API operations remain enforced by Express.
