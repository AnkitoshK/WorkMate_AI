# Architecture

```text
Expo mobile ─┐
             ├── HTTPS/JSON ── Express API ── Prisma ── PostgreSQL
Next.js web ─┘
```

The API owns persistence and validation. Mobile and web call the same REST endpoints. Prisma models users and tasks; until authentication is added, task creation supplies an `ownerId` explicitly. AI calls and secrets will remain server-side when that milestone is reached.

Build one runnable vertical slice at a time. The first slice is health check, database migration, task CRUD, and basic mobile/web screens. Add auth and authorization before treating the app as production-ready.
