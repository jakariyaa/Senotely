# Senotely

Senotely is a notes and social-posts app with user accounts, personal notes, public author posts, and admin tools for managing users and browsing interest groups.

## Quick start

### Requirements

- Node.js 24 or newer
- pnpm 12
- Docker Compose, or a MongoDB 9.0+ instance (Compose runs MongoDB 9.0.4)

### Setup

1. Create local environment files:

   ```sh
   cp server/.env.example server/.env
   cp web/.env.example web/.env.local
   ```

2. Set `JWT_SECRET` to a secret of at least 32 characters, and set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `server/.env`.
3. Install dependencies and start MongoDB plus both apps:

   ```sh
   pnpm install
   pnpm dev:full
   ```

   `pnpm dev:full` starts MongoDB with Docker Compose and launches the API and web app. If MongoDB is already running, use `pnpm dev` instead. For a separately managed local MongoDB, configure `MONGODB_URI` accordingly.

4. In another terminal, wait for MongoDB to be ready, then seed the development data:

   ```sh
   pnpm seed
   ```

   **Development data only:** seeding replaces generated `seed-user-*` records and their notes/posts, then upserts the configured seed admin. Do not run it against data you need to preserve. The seed admin uses the configured credentials.

The web app is at <http://localhost:3000>; the API is at <http://localhost:3001>. MongoDB is exposed on host port `27018` to avoid the default local MongoDB port. `GET /health` returns `{ "status": "ok" }`.

## Configuration

The example files list all supported environment variables:

- [`server/.env.example`](server/.env.example) — API, database, JWT, and seed administrator settings.
- [`web/.env.example`](web/.env.example) — web app settings.

The web app's `API_BASE_URL` defaults to `http://127.0.0.1:3001`. The server's example config uses `mongodb://127.0.0.1:27018/secure_notes`.

## Common commands

| Command          | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `pnpm dev:full`  | Start MongoDB with Compose and run both apps.                 |
| `pnpm dev`       | Run both apps; MongoDB must be started separately.            |
| `pnpm seed`      | Replace generated development data and upsert the seed admin. |
| `pnpm build`     | Build the server and web app.                                 |
| `pnpm lint`      | Lint both workspace packages.                                 |
| `pnpm typecheck` | Type-check both workspace packages.                           |
| `pnpm test`      | Run server tests.                                             |

## API overview

Paginated lists accept `page` (default 1) and `limit` (default 20, maximum 100), and return `{ data, meta: { page, limit, total, totalPages } }`, except public posts, which return `meta.hasNextPage`. Errors use `{ error: { code, message, details? } }`.

| Method                   | Path                  | Access        | Purpose                                                           |
| ------------------------ | --------------------- | ------------- | ----------------------------------------------------------------- |
| `POST`                   | `/auth/register`      | Public        | Register a user; role is always `user`.                           |
| `POST`                   | `/auth/login`         | Public        | Login; returns token and user.                                    |
| `GET`                    | `/users/me`           | Authenticated | Get the current user.                                             |
| `GET`, `POST`            | `/notes`              | Authenticated | List own notes; create a note.                                    |
| `GET`, `PATCH`, `DELETE` | `/notes/:id`          | Authenticated | Read visible note; update/delete own note only.                   |
| `POST`                   | `/posts`              | Authenticated | Create a post as the current user.                                |
| `GET`                    | `/users/:id/posts`    | Public        | List public posts by author.                                      |
| `GET`, `POST`            | `/users`              | Admin         | List users; create a managed user.                                |
| `GET`, `PATCH`, `DELETE` | `/users/:id`          | Admin         | Get, update, or delete a user; deletion cascades notes and posts. |
| `GET`                    | `/users/by-interests` | Admin         | List interest groups; optional `interest` filter.                 |
| `GET`                    | `/admin/notes`        | Admin         | List notes; optional `userId` filter.                             |
| `GET`                    | `/health`             | Public        | Check API health.                                                 |

Admins can read another user's note but cannot edit or delete it. Admins cannot delete themselves or change their own role. Posts are public to read; grouped interests are admin-only.

## Security

- Passwords use bcrypt with cost 12; hashes are not returned. Unknown-user login performs a dummy comparison.
- JWTs use HS256 and expire after `JWT_EXPIRES_IN` (default `1h`). `JWT_SECRET` must be at least 32 characters.
- The web app stores the API token only in an `httpOnly`, `sameSite=lax` cookie, `secure` in production. Server actions and server-rendered pages call the API and forward the bearer token; browser JavaScript never receives it.
- The API reloads the actor and role from MongoDB on every protected request. Next.js `proxy.ts` redirects unauthenticated users and non-admins from admin pages; API RBAC remains authoritative.
- Note ownership is constrained in API repository queries. Web form validation does not replace API validation or authorization.

## Database performance

See [Database performance](docs/database-performance.md) for the custom index rationale, aggregation details, and recorded explain results.
