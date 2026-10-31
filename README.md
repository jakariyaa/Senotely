# Secure Notes Platform

## Development

Requirements: Node.js 24+, pnpm, and Docker Compose.

```sh
cp server/.env.example server/.env
docker compose up -d
pnpm install
pnpm seed
pnpm dev
```

The API listens on port 3001 and MongoDB is exposed on host port 27018 to avoid colliding with a local MongoDB using the default port. `GET /health` returns `{ "status": "ok" }`. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `server/.env` before seeding. `pnpm seed` replaces only the generated `seed-user-*` records and their notes/posts, then upserts the configured admin.

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

## Assumptions

- Phase 0 uses one pnpm workspace package for the API; the web app will be added in Phase 7.
- MongoDB is the only service in Compose, pinned to 9.0.4.
- Posts are public to read; the grouped-interests endpoint is admin-only.
- Registration is public and always creates a `user`; the configured seed account is an admin.
- The interests index accelerates filtered grouping; grouping all users necessarily scans the user collection.
- Admins may read other users' notes but may not update or delete them.
