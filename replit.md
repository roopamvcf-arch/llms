# CyberLearn LMS

A full-stack cybersecurity Learning Management System with student and admin portals, video course player, PDF viewer, quiz engine, badge/certificate systems, analytics dashboards, and JWT auth with TOTP for admins.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 via workflow, listens on 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (run after any openapi.yaml change)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Wouter, TanStack Query, Recharts, Lucide, shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle for server)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)
- `lib/db/src/schema.ts` — Drizzle ORM schema (source of truth for DB)
- `artifacts/api-server/src/` — Express routes (auth, courses, quizzes, badges, certs, analytics, admin, upload)
- `artifacts/cyberlearn/src/pages/` — all React pages (student/* and admin/*)
- `artifacts/cyberlearn/src/components/` — shared components (sidebars, VideoWatermark, QuizEngine)

## Architecture decisions

- Contract-first API design: OpenAPI spec drives codegen for both client hooks and Zod validators
- JWT access tokens stored in-memory (via `setAccessToken`); token intercepted in generated Axios client
- Admin accounts support optional TOTP 2FA; login flow uses `step: "totp"` or `step: "done"` signals
- `listModules` returns `ModuleWithLessons[]` (modules with nested lessons) even though the Module schema exists separately — backend JOINs lessons on every modules fetch
- Express 5 path params accessed as `req.params['id']! as string` (not `req.params.id`) due to TS strictness

## Product

- **Student portal**: Dashboard, course browser, video player with moving watermark, PDF viewer, quiz engine, badges, certificates, analytics charts, settings
- **Admin portal**: Dashboard with analytics, course editor (module/lesson tree), student management, badge/certificate management, audit log, platform settings
- Dark orange + blue + green cyberpunk theme throughout

## Seeded accounts

- Admin: `admin` / `admin123` (TOTP disabled → immediate access)
- Student: `student1` / `admin123`

## User preferences

- Dark theme with orange primary, blue accents, green for success
- Monospace font for labels, headings, and stat numbers
- Cyberpunk / terminal aesthetic

## Gotchas

- After editing `openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` before typechecking the frontend
- Never edit files in `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/` — they are regenerated on every codegen run
- `useGetMe` requires `queryKey` in the query options (TanStack Query v5 strict mode)
- The frontend typecheck is `pnpm --filter @workspace/cyberlearn run typecheck`; use this, not the VS Code editor, as the source of truth

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
