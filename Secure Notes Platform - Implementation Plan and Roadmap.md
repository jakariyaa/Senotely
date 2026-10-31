# Secure Notes Platform: Implementation Plan and Roadmap

Handover brief for an AI engineering agent. Stack: Express + Node.js + Mongoose (backend), latest Next.js + default shadcn/ui (frontend), MongoDB.

## 0. Agent Operating Rules

Read this whole document before writing code. These rules override your defaults.

1. **Work phase by phase** (Section 11). Do not start a phase until the previous phase's acceptance criteria pass. Commit after each phase.
2. **Do not create any index that is not in the Index Ledger (Section 5).** The ledger has exactly 4 custom indexes. If you think another is needed, stop and document why instead of adding it.
3. **Define every index with `schema.index()`** in the model file. Never use `index: true`, `unique: true` or `sparse: true` on a field definition, because the evaluators must see indexes in `schema.index` calls.
4. **Scenario aggregations must use exactly one `Model.aggregate()` call** and no other query method in that code path (Section 6).
5. **Never trust the client** for `role`, `owner`, `author` or `_id`. Use zod schemas that whitelist fields and strip unknown keys.
6. **Do not use any template or starter kit.** Use the plain `create-next-app` CLI, `shadcn init` and individual `shadcn add` components. No dashboard blocks. Do not spend time on frontend polish.
7. **Follow SOLID** as mapped in Section 3. Controllers do HTTP only, services hold business rules, repositories hold database access.
8. When something in this plan is ambiguous, pick the simplest option that satisfies the brief, and record the decision in `README.md` under Assumptions.

## 1. Goal and What Is Graded

Build a REST API with a functional (unstyled) frontend for a note-taking platform with JWT auth and role-based access control. Evaluators check four things, and every section below traces back to them:

| #   | Criterion                                      | Where it is handled             |
| --- | ---------------------------------------------- | ------------------------------- |
| 1   | Every query is backed by an index              | Sections 5, 12                  |
| 2   | No extra indexes                               | Sections 5, 12 (exact-set test) |
| 3   | Both aggregations meet their exact constraints | Section 6, 12                   |
| 4   | RBAC, password hashing and JWT are correct     | Sections 7, 8                   |

**Roles**

- **User:** create, update, delete and list their own notes.
- **Admin:** everything a user can do, plus manage users (add, remove, update, list) and view everyone's notes.

**Functional requirements recap:** pagination on all list endpoints; Scenario 1 (users grouped by interests); Scenario 2 (all posts of a particular user via `$lookup`; posts are public).

## 2. Stack and Versions

| Concern             | Choice                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime             | Node.js 24 LTS or newer, TypeScript (strict mode), ESM consistently                                                                                               |
| HTTP                | Express 5                                                                                                                                                         |
| ODM                 | Mongoose (latest)                                                                                                                                                 |
| Database            | MongoDB **9** (deployment target; supports `$lookup` with `localField`/`foreignField` plus `pipeline`). Provide a `docker-compose.yml` that runs only MongoDB |
| Validation          | zod                                                                                                                                                               |
| Password hashing    | `argon2` (argon2id) or `bcrypt` with cost 12. Pick one and hide it behind an interface                                                                            |
| JWT                 | `jsonwebtoken` (HS256)                                                                                                                                            |
| Security middleware | `helmet`, `cors` (single allowed origin), `express-rate-limit`                                                                                                    |
| Logging             | `pino` + `pino-http`                                                                                                                                              |
| Tests               | Vitest or Jest + Supertest + `mongodb-memory-server` (use a 9.0.4 binary) or the compose Mongo                                                                    |
| Frontend            | Latest stable Next.js (App Router), default shadcn/ui styles, Tailwind as installed by shadcn                                                                     |

## 3. Architecture and SOLID Mapping

Layered, with manual dependency injection (no DI framework needed).

```
routes -> controller -> service -> repository (interface) -> Mongoose model
```

| Principle                 | Concrete rule in this project                                                                                                                                                                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S**ingle Responsibility | Controllers: parse request, call one service method, shape response. Services: business rules and authorization decisions. Repositories: all Mongoose calls. Middleware: one concern each (authenticate, authorize, validate, rate limit, error handling).                                                                        |
| **O**pen/Closed           | Permissions live in a single map `role -> Set<Permission>` in `shared/rbac/permissions.ts`. Adding a role or permission means editing the map, not touching handlers. Admin is defined as `user` permissions plus extras (spread), which expresses inheritance. Pagination and error mapping are shared helpers, not copy-pasted. |
| **L**iskov Substitution   | Each repository has a TypeScript interface (`UserRepository`, `NoteRepository`, `PostRepository`). The Mongoose implementation and an in-memory fake used in unit tests are interchangeable with identical contracts.                                                                                                             |
| **I**nterface Segregation | Small, role-focused interfaces: `PasswordHasher { hash, verify }`, `TokenService { sign, verify }`, `Clock`. Services depend only on the methods they use. Split repository interfaces if a consumer needs only reads (for example `UserReader` for the auth middleware).                                                         |
| **D**ependency Inversion  | Services receive dependencies through constructors. `container.ts` is the only place that does `new MongooseUserRepository()`, `new BcryptHasher()` and so on. `createApp(deps)` takes the container, so tests can inject fakes. Services never import `mongoose`, `jsonwebtoken` or `bcrypt` directly.                           |

**Error handling:** a small `AppError` hierarchy (`ValidationError` 400, `UnauthorizedError` 401, `ForbiddenError` 403, `NotFoundError` 404, `ConflictError` 409). Services throw them, and one central `errorHandler` middleware maps them to JSON. Unknown errors become a generic 500 with no stack trace in responses. Mongo duplicate key error `11000` maps to `ConflictError`.

## 4. Project Structure

```
notes-platform/
  docker-compose.yml          # MongoDB only
  README.md
  server/
    .env.example
    src/
      config/        env.ts (zod-validated env), db.ts
      shared/
        errors/      AppError.ts, errorHandler.ts
        middleware/  authenticate.ts, authorize.ts, validate.ts, rateLimit.ts
        rbac/        permissions.ts, roles.ts
        security/    PasswordHasher.ts, BcryptHasher.ts (or Argon2Hasher.ts), TokenService.ts, JwtTokenService.ts
        pagination/  pagination.ts   # parse + meta builder
        http/        asyncHandler.ts, response.ts
      modules/
        auth/    auth.routes.ts, auth.controller.ts, auth.service.ts, auth.schemas.ts
        users/   user.model.ts, user.repository.ts, user.mongoose.repository.ts,
                 user.service.ts, user.controller.ts, user.routes.ts, user.schemas.ts
        notes/   note.model.ts, ... (same layout)
        posts/   post.model.ts, ... (same layout)
      container.ts   # composition root
      app.ts         # createApp(container)
      server.ts      # connect DB, init indexes, listen, graceful shutdown
    scripts/   seed.ts, verify-indexes.ts, explain.ts
    tests/
  web/
    app/ ... (Section 10)
```

## 5. Data Models and the Index Ledger

### 5.1 Schemas

**User**

- `name: String, required, trim`
- `email: String, required, trim, lowercase` (no `unique` on the field)
- `passwordHash: String, required, select: false`
- `role: String, enum ['user','admin'], default 'user'`
- `interests: [String]` (normalized: trimmed, lowercased, deduplicated, max 20 items, max 30 chars each; enforced in the zod schema and a setter)
- `{ timestamps: true }`

**Note**

- `owner: ObjectId, ref 'User', required`
- `title: String, required, max 200`
- `content: String, required, max 10000`
- `{ timestamps: true }`

**Post**

- `author: ObjectId, ref 'User', required`
- `title: String, required, max 200`
- `content: String, required, max 10000`
- `{ timestamps: true }`

Set `toJSON` transforms to remove `__v` and `passwordHash`. Set `autoIndex` from env (true in dev and for review, so indexes are built on startup), and call `await Model.init()` for each model before the server starts listening.

### 5.2 Query inventory and the Index Ledger

Every read path, with the index that serves it. Anything marked "default" uses the built-in `_id` index and must not get a custom one.

| #   | Query                                                | Access pattern                         | Served by                                    |
| --- | ---------------------------------------------------- | -------------------------------------- | -------------------------------------------- |
| Q1  | Login lookup                                         | `users.findOne({email})`               | **Index A**                                  |
| Q2  | Email uniqueness on register/update                  | unique constraint                      | **Index A**                                  |
| Q3  | Auth middleware, `/users/me`, admin get user         | `findById`                             | default `_id`                                |
| Q4  | Admin lists users (paginated)                        | `find().sort({_id:-1}).skip().limit()` | default `_id` (backward scan, no sort stage) |
| Q5  | User lists own notes (paginated)                     | `find({owner}).sort({_id:-1})`         | **Index B**                                  |
| Q6  | Admin lists all notes (paginated)                    | `find().sort({_id:-1})`                | default `_id`                                |
| Q7  | Admin lists notes of one user                        | `find({owner}).sort({_id:-1})`         | **Index B**                                  |
| Q8  | Get/update/delete one note                           | `{_id}` or `{_id, owner}`              | default `_id`                                |
| Q9  | Count for note pagination                            | `countDocuments({owner})`              | **Index B**                                  |
| Q10 | Cascade delete notes on user delete                  | `deleteMany({owner})`                  | **Index B**                                  |
| Q11 | Cascade delete posts on user delete                  | `deleteMany({author})`                 | **Index C**                                  |
| Q12 | Scenario 2 posts of a user                           | `$lookup` on `posts.author` with sort  | **Index C**                                  |
| Q13 | Scenario 1 interests grouping (filtered by interest) | `$match {interests}` first stage       | **Index D**                                  |

### 5.3 The complete and final list of custom indexes

```ts
// user.model.ts
userSchema.index({ email: 1 }, { unique: true }); // A: Q1, Q2 (login and uniqueness)
userSchema.index({ interests: 1 }); // D: Q13 (multikey; supports $match in Scenario 1)

// note.model.ts
noteSchema.index({ owner: 1, _id: -1 }); // B: Q5, Q7, Q9, Q10 (equality on owner, sort by _id desc)

// post.model.ts
postSchema.index({ author: 1, _id: -1 }); // C: Q11, Q12 (equality on author, sort by _id desc)
```

**Rules that keep this list at four:**

- Sort lists by `_id` descending rather than `createdAt`. ObjectIds embed creation time, so newest-first order is preserved and no `createdAt` index is needed.
- Do not add indexes on `role`, `name`, `createdAt`, `updatedAt`, or `title`. Do not add any text index. Do not add filters or sorts on those fields to any endpoint, because that would create an unindexed query.
- No `ref` option, `timestamps` option or `populate` creates an index. Do not use `populate`.
- Each index in code gets a one-line comment naming the query IDs it serves (as above).
- `{ owner: 1, _id: -1 }` already covers any query on `owner` alone (prefix rule), so no separate `{ owner: 1 }` index. The same applies to `author`.

**Known trade-off to document in the README:** Index D only helps when Scenario 1 starts with a `$match` on `interests`. The unfiltered "group everyone" view is inherently a full scan because every user must be read. Keep Index D, expose the optional `interest` filter, and state this reasoning plainly.

## 6. Aggregation Specifications

Both scenarios live in repository methods and each must contain exactly one `Model.aggregate([...])` call, with the result returned directly or reshaped in memory by pure functions.

### 6.1 Scenario 1: Users grouped by interests (admin only)

`UserRepository.groupByInterests({ interest?, page, limit, usersPerGroup })` runs `User.aggregate(pipeline)` once. Forbidden in this code path: `find`, `countDocuments`, `distinct`, `estimatedDocumentCount`, a second `aggregate`.

Pipeline outline:

```ts
[
  ...(interest ? [{ $match: { interests: interest } }] : []), // uses Index D
  { $project: { name: 1, email: 1, interests: 1 } }, // never include passwordHash
  { $unwind: '$interests' },
  ...(interest ? [{ $match: { interests: interest } }] : []), // keep only the requested group after unwind
  {
    $group: {
      _id: '$interests',
      count: { $sum: 1 },
      users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
    },
  },
  { $sort: { _id: 1 } },
  {
    $facet: {
      items: [
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            interest: '$_id',
            count: 1,
            users: { $slice: ['$users', usersPerGroup] },
          },
        },
      ],
      total: [{ $count: 'value' }],
    },
  },
];
```

Notes for the implementer:

- Pagination here is over **groups**, and `$facet` returns the total group count inside the same single call. `usersPerGroup` defaults to 20 and is capped. Use `$topN` to bound users retained per group; the deployment target is MongoDB 9.0.4.
- The service maps `[{ items, total: [{ value }] }]` to `{ data, meta }`. When `total` is empty, the total is 0.
- Normalize the `interest` query param (trim and lowercase) before the `$match`.

### 6.2 Scenario 2: All posts of a particular user (`$lookup`)

`PostRepository.findByAuthor({ userId, page, limit })` (or `UserRepository`, wherever it reads best) runs `User.aggregate(pipeline)` once:

```ts
[
  { $match: { _id: userObjectId } }, // _id index
  {
    $lookup: {
      from: 'posts',
      localField: '_id',
      foreignField: 'author', // Index C
      pipeline: [
        { $sort: { _id: -1 } }, // served by Index C, no in-memory sort
        { $skip: (page - 1) * limit },
        { $limit: limit + 1 }, // fetch one extra to compute hasNextPage
        { $project: { author: 0, __v: 0 } },
      ],
      as: 'posts',
    },
  },
  { $project: { _id: 1, name: 1, posts: 1 } }, // never expose email or passwordHash on a public endpoint
];
```

- Empty result array means the user does not exist: throw `NotFoundError`.
- The service slices the extra item off and returns `meta: { page, limit, hasNextPage }`. This avoids a second query for a total, which keeps this scenario a single pipeline. (Alternative if a total is demanded: a `$facet` inside the lookup sub-pipeline, at the cost of buffering all of the user's posts.)
- Requires MongoDB 5.0+ for `$lookup` with a sub-pipeline. This project requires MongoDB 9.0+; startup must fail clearly on older versions.

## 7. Security: Passwords, JWT, RBAC

### 7.1 Passwords

- Hash with argon2id or bcrypt cost 12 via the `PasswordHasher` interface. Never log, return, or select `passwordHash`.
- Password policy via zod: min 8 and max 72 chars (bcrypt's 72-byte limit; enforce the same max for argon2 for consistency).
- Login must not reveal whether the email exists: same message (`Invalid credentials`) and 401 for unknown email and wrong password. Run a dummy hash comparison when the user is not found to reduce timing differences.
- `select: false` on the field, so the login query explicitly uses `.select('+passwordHash')`.

### 7.2 JWT

- `JwtTokenService` signs `{ sub: userId }` only, with algorithm HS256, expiry from env (default `1h`), and a secret of at least 32 characters validated at boot (the app refuses to start otherwise).
- Verify with an explicit `algorithms: ['HS256']` option. Reject missing, malformed, expired and wrong-signature tokens with 401.
- **Role is never read from the token.** The `authenticate` middleware loads the user by `_id` on every request (default index), so role changes and deleted users take effect immediately. Attach `req.actor = { id, role }`.
- Token is sent as `Authorization: Bearer <token>` to Express. The Next.js layer stores it in an httpOnly cookie (Section 10).

### 7.3 RBAC

- `permissions.ts`:

```ts
const USER_PERMS = ['note:create', 'note:read:own', 'note:update:own', 'note:delete:own'] as const;
export const ROLE_PERMISSIONS = {
  user: new Set(USER_PERMS),
  admin: new Set([
    ...USER_PERMS,
    'note:read:any',
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:list',
    'user:group-by-interest',
  ]),
};
```

- `authorize(permission)` middleware checks the actor's role against the map. Returns 403 if missing.
- **Ownership is enforced in the query**, not after loading: users get `findOne({ _id, owner: actor.id })`, and a miss returns 404 (not 403) so note existence is not leaked.
- Note rules: owner or admin may **read** any note by id; only the **owner** may update or delete a note (admin inherits user capabilities for their own notes only). Admin lists everyone's notes through `/admin/notes`.
- User management guards (no extra index needed): an admin cannot delete themselves and cannot change their own role. This guarantees at least one admin always remains from a single actor's point of view. Do not implement a "count admins" check, because `role` is deliberately unindexed and that query would be a collection scan.
- Public registration always creates `role: 'user'`. The first admin comes from the seed script. Only an admin can create users with an admin role.
- Admin updating a user may change `name`, `email`, `role`, `interests`, and optionally reset the password (re-hashed). Reject any other keys.

### 7.4 Hardening

`helmet`, CORS restricted to `WEB_ORIGIN`, JSON body limit (for example 100kb), rate limit on `/auth/*` (for example 10 per 15 min per IP), `x-powered-by` disabled, strict zod validation of ObjectIds (reject invalid ids with 400, not 500), and zod type checks on every body and query to rule out NoSQL operator injection (no object values where strings are expected).

## 8. API Contract

All list responses: `{ data: [...], meta: { page, limit, total, totalPages } }`. `page` defaults to 1, `limit` defaults to 20 and is capped at 100. Scenario 2 returns `hasNextPage` instead of `total` (see 6.2). Errors: `{ error: { code, message, details? } }`.

| Method           | Path                  | Auth  | Permission               | Notes                                 |
| ---------------- | --------------------- | ----- | ------------------------ | ------------------------------------- |
| POST             | `/auth/register`      | none  | none                     | creates role `user` only              |
| POST             | `/auth/login`         | none  | none                     | returns `{ token, user }`             |
| GET              | `/users/me`           | any   | none                     | current user                          |
| GET              | `/notes`              | any   | `note:read:own`          | own notes, paginated                  |
| POST             | `/notes`              | any   | `note:create`            | owner set from actor                  |
| GET              | `/notes/:id`          | any   | own or `note:read:any`   | 404 if not visible                    |
| PATCH            | `/notes/:id`          | any   | `note:update:own`        | owner only                            |
| DELETE           | `/notes/:id`          | any   | `note:delete:own`        | owner only                            |
| POST             | `/posts`              | any   | none                     | author set from actor                 |
| GET              | `/users/:id/posts`    | none  | none                     | **Scenario 2**, public                |
| GET              | `/users`              | admin | `user:list`              | paginated                             |
| POST             | `/users`              | admin | `user:create`            | may set role                          |
| GET/PATCH/DELETE | `/users/:id`          | admin | `user:*`                 | delete cascades notes and posts       |
| GET              | `/users/by-interests` | admin | `user:group-by-interest` | **Scenario 1**, optional `?interest=` |
| GET              | `/admin/notes`        | admin | `note:read:any`          | optional `?userId=`                   |

**Route ordering:** declare `/users/me` and `/users/by-interests` before `/users/:id`.

Status codes: 201 on create, 200 on read/update, 204 on delete, 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 duplicate email, 429 rate limited.

## 9. Cross-Cutting Best Practices

- **Config:** one zod-validated `env.ts`. Fail fast on missing or weak values. Provide `.env.example`.
- **Mongoose:** use `.lean()` for reads that return plain data, and explicit projections. Set `mongoose.set('strictQuery', true)`. Keep schemas strict.
- **Pagination helper:** one function `parsePagination(query)` returning `{ page, limit, skip }` and one `buildMeta(total, page, limit)`. No endpoint reimplements this.
- **Counting:** use `countDocuments(filter)` with an indexed filter. For the unfiltered admin lists, use `estimatedDocumentCount()`, which needs no scan. Never count on an unindexed field.
- **Cascade delete:** user delete runs `deleteMany({owner})` on notes and `deleteMany({author})` on posts, then deletes the user. Order and failure handling documented. A transaction is optional, and requires a replica set, so skip it unless the compose file runs one.
- **Graceful shutdown:** close HTTP server and Mongo connection on SIGINT/SIGTERM.
- **Logging:** structured request logs, redact `authorization` header and password fields.
- **Code quality:** TypeScript strict, ESLint, Prettier, no `any`, no business logic in routes, no Mongoose imports outside repositories, models and `db.ts`.
- **Commits:** one per phase with a clear message.

## 10. Frontend Plan (functional, minimal)

Use `pnpx create-next-app@latest` (App Router, TypeScript, Tailwind), then `pnpx shadcn@latest init` with default style, then add only components that are needed (button, input, label, textarea, table, dialog, card, select, pagination or simple prev/next buttons, form, sonner). **No templates, no shadcn blocks, no custom theming.**

- **Auth handling:** login and register use Next.js server actions or route handlers that call Express and store the JWT in an **httpOnly, secure (in production), sameSite=lax cookie**. Server components and server actions read the cookie and forward it as `Authorization: Bearer`. The token must never be exposed to client-side JavaScript or stored in localStorage.
- **Route protection:** use the Next.js request interception file for the installed major version (`middleware.ts`, or `proxy.ts` in newer versions; check the docs for the installed version) to redirect unauthenticated users to `/login`, and gate `/admin/*` on the role returned by `/users/me`. This is UX only; the real enforcement is the API.
- **Pages:**
  - `/login`, `/register`
  - `/notes`: paginated list, create and edit dialog, delete with confirm
  - `/users/[id]`: user name plus their posts (Scenario 2), with a form to create your own post on your own page
  - `/admin/users`: paginated table, create, edit (role, interests), delete
  - `/admin/notes`: paginated table with a user filter
  - `/admin/interests`: grouped view (Scenario 1) with optional interest filter
- Keep one small typed `api.ts` client on the server side. Show API error messages in a toast(sonner). Do not add animations, theming or extra pages.

## 11. Phased Roadmap with Acceptance Criteria

### Phase 0: Project setup

**Tasks:** monorepo folders, TypeScript, ESLint and Prettier, `docker-compose.yml` (MongoDB 9.0.4), `env.ts`, `db.ts`, `GET /health`, central error handler skeleton. **Done when:** `docker compose up -d && pnpm run dev` boots, and the app exits with a clear error when env is invalid.

### Phase 1: Models and indexes

**Tasks:** three schemas, exactly the four `schema.index()` calls from 5.3 with comments, `Model.init()` on startup, `scripts/verify-indexes.ts`. **Done when:** `verify-indexes` compares `collection.indexes()` of users, notes, posts against an allowlist (`_id_` plus Indexes A to D only) and fails on any difference. No field uses `index`, `unique` or `sparse`.

### Phase 2: Security primitives and Auth

**Tasks:** `PasswordHasher` and `TokenService` interfaces plus implementations, `AuthService` (register, login), `authenticate` and `authorize` middleware, permissions map, zod `validate` middleware, rate limit on `/auth`, `container.ts` and `createApp(container)`. **Done when:** register forces `role: 'user'` even if the body sends `role: 'admin'`; login returns a token; the same 401 message for unknown email and wrong password; expired and tampered tokens return 401; the hash never appears in any response; deleted user's valid token returns 401.

### Phase 3: Notes

**Tasks:** note repository (interface plus Mongoose), service, controller, routes; `parsePagination` and `buildMeta` helpers; own-notes CRUD; `GET /admin/notes` with optional `userId`. **Done when:** user A gets 404 on user B's note for read, update and delete; admin can read B's note but gets 404 on updating or deleting it (not owner); lists are paginated, newest first, capped at limit 100.

### Phase 4: Admin user management

**Tasks:** user service and routes for list, create, get, update, delete; cascade delete; self-delete and self-role-change guards; duplicate email handling. **Done when:** non-admin gets 403 on every `/users` admin route; admin cannot delete themselves or change their own role; deleting a user removes their notes and posts; duplicate email returns 409.

### Phase 5: Posts and aggregations

**Tasks:** `POST /posts`; Scenario 2 pipeline per 6.2; Scenario 1 pipeline per 6.1; routes in the right order. **Done when:** a Jest or Vitest spy proves each scenario calls `Model.aggregate` exactly once and calls none of `find`, `findOne`, `countDocuments`, `distinct`; no response contains `email` (Scenario 2) or `passwordHash` (either).

### Phase 6: Seed and index verification

**Tasks:** `scripts/seed.ts` creates one admin (credentials from env), about 5,000 users with random interests drawn from a pool of about 30, about 50,000 notes, about 20,000 posts, including one heavy user with 2,000 notes and posts. `scripts/explain.ts` runs `.explain('executionStats')` for every query Q1 to Q13, verifies expected index use, and reports execution counters as diagnostics. **Done when:** `pnpm run explain` exits 0 and prints a results table that is recorded in the README.

### Phase 7: Frontend

**Tasks:** setup per Section 10, all pages, cookie auth flow. **Done when:** a user can register, log in, create, edit, delete and paginate notes; an admin can manage users, view all notes, see grouped interests; a user can view another user's posts.

### Phase 8: Tests, README, final audit

**Tasks:** tests listed in Section 12, README per Section 13, run the Section 14 checklist. **Done when:** all tests pass on a fresh clone following only the README.

## 12. Verification and Evidence

### 12.1 Expected explain results (checked by `scripts/explain.ts`)

| Query                     | Expected winning plan                                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1 login                  | `IXSCAN` on `email_1`                                                                                                                                       |
| Q3 get by id              | `IDHACK` or `EXPRESS_IXSCAN` / `IXSCAN` on `_id_`                                                                                                           |
| Q4 admin list users       | `IXSCAN` on `_id_` (backward), **no `SORT` stage**                                                                                                          |
| Q5, Q7 notes by owner     | `IXSCAN` on `owner_1__id_-1`, **no `SORT` stage**                                                                                                           |
| Q6 admin all notes        | `IXSCAN` on `_id_`, no `SORT` stage                                                                                                                         |
| Q8 note by id (and owner) | `_id_` index                                                                                                                                                |
| Q9 count by owner         | `COUNT_SCAN`/`IXSCAN` on `owner_1__id_-1`                                                                                                                   |
| Q10, Q11 cascade deletes  | `IXSCAN` on the owner / author index                                                                                                                        |
| Q12 Scenario 2            | first stage `_id_`; `$lookup` stage reports `indexesUsed` containing `author_1__id_-1`; `totalDocsExamined` close to the page size, not the collection size |
| Q13 Scenario 1 filtered   | first stage `IXSCAN` on `interests_1`. Unfiltered form is a documented full scan                                                                            |

The script fails if an expected index is not reported. It prints `docsExamined`, `keysExamined`, and `nReturned` as diagnostics, without a universal ratio threshold: dataset size and query shape affect useful scan-efficiency limits. Stage names and execution time are not gates because explain output and plans can vary across MongoDB versions, and `explain` does not use the plan cache.

### 12.2 Automated tests

1. **Exact index set:** the allowlist test from Phase 1 (fails if anyone adds an index).
2. **Auth:** register ignores `role`; wrong password and unknown email are indistinguishable; token expiry and tampering; password hash never returned.
3. **RBAC matrix:** every endpoint against anonymous, user and admin (expected status in a table-driven test).
4. **Ownership:** cross-user read, update and delete return 404.
5. **Admin guards:** cannot delete self, cannot change own role.
6. **Pagination:** page and limit bounds, limit cap, meta correctness.
7. **Aggregation constraints:** single `aggregate` call, no other query method, correct grouping output, `$lookup` returns only that user's posts, unknown user returns 404.

## 13. README Deliverable

The README must contain:

1. Quick start (`docker compose up -d`, `.env` from `.env.example`, `pnpm run seed`, run server and web).
2. The **Index Ledger table** from Section 5.2 and the four index definitions, with the one-line justification for each, and a statement of what was deliberately _not_ indexed and why (sort by `_id`, no `role` or `createdAt` index).
3. The two aggregation pipelines with an explanation of how each satisfies its constraint.
4. The `explain` results table produced by `pnpm run explain`.
5. Security notes: hashing algorithm and cost, JWT algorithm and expiry, role loaded from the DB on each request, ownership in queries.
6. API reference (Section 8) and the Scenario 1 unfiltered-scan trade-off.
7. Assumptions: posts are public to read; the interests view is admin-only; registration is public and role is always `user`; MongoDB 9.0+ required; admin may read but not edit or delete other users' notes.

## 14. Final Self-Audit Checklist

Tick every item before declaring the task complete.

**Indexing**

- [ ] Exactly 4 custom indexes exist, and all are defined with `schema.index()`.
- [ ] No field-level `index`, `unique` or `sparse` options anywhere.
- [ ] `verify-indexes` and `explain` both pass; expected indexes are present for indexed queries.
- [ ] No endpoint filters or sorts on an unindexed field.
- [ ] Every list endpoint is paginated with a capped limit.

**Aggregations**

- [ ] Scenario 1: one `User.aggregate()` call; no other query methods; `passwordHash` never projected.
- [ ] Scenario 2: one aggregation with a `$lookup` stage, indexed on `posts.author`; sort inside the lookup sub-pipeline.

**Security**

- [ ] Password hashed with bcrypt (cost 12+) or argon2id, never returned.
- [ ] JWT: HS256 pinned on verify, expiry set, secret at least 32 chars, role not trusted from the token.
- [ ] Every protected route has `authenticate`, and every privileged route has `authorize(permission)`.
- [ ] Ownership enforced in the query; mass assignment impossible (`role`, `owner`, `author` never from body except admin role set on admin user routes).
- [ ] Rate limit, helmet, CORS allowlist enabled; errors never leak stack traces.

**Design**

- [ ] Controllers contain no business logic; services never import Mongoose, bcrypt or jsonwebtoken.
- [ ] All dependencies wired in `container.ts` only; `createApp(container)` used in tests.
- [ ] Permissions live in one map; no scattered `if (role === 'admin')` checks in handlers.
- [ ] README complete; a fresh clone runs from README steps alone.
