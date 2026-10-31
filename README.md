# Secure Notes Platform

## Development

Requirements: Node.js 24+ and pnpm.

```sh
cp server/.env.example server/.env
docker compose up -d
pnpm install
pnpm dev
```

The API listens on port 3001 and MongoDB is exposed on host port 27018 to avoid colliding with a local MongoDB using the default port. `GET /health` returns `{ "status": "ok" }`.

## Assumptions

- Phase 0 uses one pnpm workspace package for the API; the web app will be added in Phase 7.
- MongoDB is the only service in Compose, pinned to 9.0.4.
