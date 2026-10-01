# Local setup

## Prerequisites

- Node.js 20.19 or later (Node 22 recommended)
- pnpm 10
- PostgreSQL 14 or later, locally or through a development database provider
- Expo Go for a quick mobile preview, or an Android/iOS simulator

## Install and configure

From the repository root, run `pnpm install`. Copy `apps/api/.env.example` to `apps/api/.env` and fill in a PostgreSQL connection string. Do not commit `.env` files.

Run `pnpm --filter @workmate/api prisma:migrate` to apply the initial migration and `pnpm --filter @workmate/api db:seed` to add the demo user used by the unauthenticated starter UI. Then start API, web, and mobile from separate terminals. See the root README for the commands.

The API's default port is 4000. The browser can use localhost. A physical phone must use the computer's LAN IP for `EXPO_PUBLIC_API_URL`; `localhost` on the phone points to the phone itself.
