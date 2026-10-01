# WorkMate AI

A learning project for task and issue management across field and office teams. The first milestone is deliberately small: an Expo mobile app, a Next.js dashboard, an Express API, PostgreSQL, Prisma, and task CRUD.

## Stack

- Mobile: Expo + React Native + Expo Router
- Web: Next.js App Router + TypeScript
- API: Node.js + Express + TypeScript + Zod
- Database: PostgreSQL + Prisma
- Workspace: pnpm

## Repository layout

```text
apps/mobile  Expo app
apps/web     Next.js dashboard
apps/api     Express REST API and Prisma schema
docs         Setup and architecture notes
```

## Local setup

Requirements: Node.js 20.19+ (Node 22 recommended), pnpm 10, and a PostgreSQL database.

1. Enable pnpm with `corepack enable` (or install pnpm using its official instructions).
2. Run `pnpm install` from the repository root.
3. Copy `apps/api/.env.example` to `apps/api/.env` and set `DATABASE_URL`.
4. Run `pnpm --filter @workmate/api prisma:migrate` to create the initial database schema, then `pnpm --filter @workmate/api db:seed` to create a demo owner for the first CRUD screens.
5. Start services in separate terminals with `pnpm dev:api`, `pnpm dev:web`, and `pnpm dev:mobile`.

The API listens on port 4000. The web dashboard uses `http://localhost:4000` by default. For a physical phone, set the mobile API URL to your computer's LAN address in `apps/mobile/.env`.

## First endpoints

- `GET /health`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

Task writes need an `ownerId` until authentication is introduced in a later milestone. AI keys, database credentials, and future signing secrets stay on the server.

## Learning sequence

Follow [docs/setup.md](docs/setup.md) and [docs/architecture.md](docs/architecture.md). Authentication, issues, AI, realtime, Redis, tests, Docker, and deployment are later milestones; they are intentionally not part of the first slice.
