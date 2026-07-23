# CyberLearn LMS

A full-stack cybersecurity Learning Management System with separate student and admin portals. Students can browse and enroll in cybersecurity courses, watch video lectures, read PDF guides, take quizzes, earn badges, download certificates, and track their progress through analytics dashboards. Admins manage courses, students, badges, certificates, platform settings, and have a full audit log.

---

## Features

### Student Portal
- Dashboard with enrollment stats, recent activity, and notifications
- Course browser with difficulty levels (Beginner / Intermediate / Advanced)
- Video player with moving watermark (anti-screenshot protection)
- In-browser PDF viewer
- Quiz engine (MCQ, Multi-select, True/False) with timed attempts and pass thresholds
- Badge system — earn badges for course completions and quiz performance
- Certificate generation (PDF download with unique hash for verification)
- Analytics charts — progress over time, quiz scores, completion rates
- Video timestamp notes
- User settings (theme, font size, language, avatar color, password change)

### Admin Portal
- Dashboard with platform-wide analytics and charts
- Course editor — create/edit courses with nested module and lesson trees (VIDEO / PDF / QUIZ)
- Student management — view, activate/deactivate accounts
- Badge management — create and assign badge criteria
- Certificate management — view all issued certificates
- Platform settings — platform name, maintenance mode, admin panel toggle
- Full audit log of all admin actions
- TOTP two-factor authentication for admin accounts

### Security
- JWT authentication (access token in-memory, refresh token in HTTP-only cookie)
- bcrypt password hashing
- TOTP 2FA (Google Authenticator compatible) for admins
- Account lockout after failed login attempts
- Rate limiting on API endpoints
- Role-based access control (ADMIN / STUDENT)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Language | TypeScript 5.9 |
| Package Manager | pnpm 9 (workspaces) |
| Frontend | React 19, Vite 7, TailwindCSS 4 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Routing | Wouter |
| Data Fetching | TanStack Query v5 |
| Charts | Recharts |
| Animations | Framer Motion |
| Backend | Express 5 |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Validation | Zod v4, drizzle-zod |
| API Codegen | Orval (OpenAPI → React Query hooks + Zod schemas) |
| Auth | jsonwebtoken, bcryptjs, speakeasy (TOTP) |
| File Uploads | Multer |
| PDF Generation | PDFKit |
| QR Codes | qrcode |
| Logging | Pino + pino-http |
| Build (server) | esbuild |

---

## Quick Install — Kali Linux (one command)

Clone the repo and run the installer. It handles everything automatically — Node.js, pnpm, PostgreSQL, database setup, build, and registers the `cyberlearn` launch command system-wide.

```bash
git clone https://github.com/roopamvcf-arch/llms.git && cd llms && sudo bash install.sh
```

Once done, launch from any terminal, anywhere:

```bash
cyberlearn
```

This starts the server and automatically opens `http://localhost:5000` in your browser.

> The installer is idempotent — safe to run again if anything fails or after an update.

---

## Prerequisites

- **Node.js** v20+ (`node --version`) — installed automatically by `install.sh` if missing
- **pnpm** v9+ — installed automatically by `install.sh` if missing
- **PostgreSQL** 14+ — installed automatically by `install.sh` if missing
  - Detected port is used automatically; adjust `DATABASE_URL` in `.env` if needed

---

## Manual Installation

## Manual Installation

### 1. Clone the repository

```bash
git clone https://github.com/roopamvcf-arch/llms.git
cd llms
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Create a `.env` file in the project root (copy from the example below):

```env
DATABASE_URL=postgresql://<user>@localhost:5432/cyberlearn?sslmode=disable
SESSION_SECRET=change_this_to_a_long_random_secret
PORT=5000
BASE_PATH=/
NODE_ENV=development
```

Replace `<user>` with your PostgreSQL username.

### 4. Create the database

```bash
psql -U <your_pg_user> -c "CREATE DATABASE cyberlearn;"
```

### 5. Push the schema to the database

```bash
pnpm --filter @workspace/db run push
```

### 6. Seed sample data (optional but recommended for development)

```bash
pnpm --filter @workspace/db run push-force
# then run the seed script:
cd lib/db && node --loader tsx src/seed.ts
```

Or using tsx directly from the root:

```bash
cd lib/db && npx tsx src/seed.ts
```

---

## Running Locally

The project has two processes to start — the API server and the frontend dev server. Run each in a separate terminal.

### Terminal 1 — API Server (port 5000)

```bash
pnpm --filter @workspace/api-server run dev
```

This builds the server with esbuild, then starts it. The API is available at `http://localhost:5000/api`.

### Terminal 2 — Frontend Dev Server

```bash
pnpm --filter @workspace/cyberlearn run dev
```

Vite starts on the port defined by `PORT` in `.env` (default `5000`).

> **Note:** In development, Vite proxies all `/api` requests to `http://localhost:5000`, so the frontend and API can run on different ports without CORS issues.

### Production Build

```bash
pnpm run build
```

After a production build, the Express server serves the compiled React app statically. Start with:

```bash
pnpm --filter @workspace/api-server run start
```

---

## Default Login Credentials

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Student | `student1` | `admin123` |

> **Change these immediately in any non-local environment.**

---

## API Codegen

The API contract lives in `lib/api-spec/openapi.yaml`. After any changes to that file, regenerate the client hooks and Zod validators:

```bash
pnpm --filter @workspace/api-spec run codegen
```

> Never manually edit files in `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/` — they are fully regenerated on every codegen run.

---

## Folder Structure

```
.
├── artifacts/
│   ├── api-server/          # Express 5 API server
│   │   ├── src/
│   │   │   ├── index.ts     # Entry point — reads PORT, starts server
│   │   │   ├── app.ts       # Express app setup, middleware, static serving
│   │   │   ├── routes/      # All API route handlers
│   │   │   │   ├── auth.ts
│   │   │   │   ├── courses.ts
│   │   │   │   ├── quizzes.ts
│   │   │   │   ├── badges.ts
│   │   │   │   ├── certificates.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   ├── admin.ts
│   │   │   │   ├── upload.ts
│   │   │   │   └── ...
│   │   │   └── lib/
│   │   │       ├── jwt.ts   # JWT sign/verify utilities
│   │   │       └── logger.ts
│   │   └── build.mjs        # esbuild config for production bundle
│   │
│   └── cyberlearn/          # React + Vite frontend
│       └── src/
│           ├── main.tsx     # React entry point
│           ├── App.tsx      # Router, QueryClient, AuthProvider
│           ├── pages/
│           │   ├── student/ # Student portal pages
│           │   └── admin/   # Admin portal pages
│           ├── components/  # Shared UI components
│           └── lib/
│               └── auth.tsx # Auth context and token management
│
├── lib/
│   ├── db/                  # Drizzle ORM schema and DB client
│   │   └── src/
│   │       ├── index.ts     # DB connection (pg pool)
│   │       ├── schema/      # All table definitions
│   │       │   ├── users.ts
│   │       │   ├── courses.ts
│   │       │   ├── quizzes.ts
│   │       │   └── gamification.ts
│   │       └── seed.ts      # Dev seed data
│   │
│   ├── api-spec/
│   │   └── openapi.yaml     # OpenAPI 3.1 spec (source of truth)
│   │
│   ├── api-client-react/    # Generated React Query hooks (do not edit)
│   └── api-zod/             # Generated Zod schemas (do not edit)
│
├── scripts/                 # Utility scripts
├── uploads/                 # Uploaded course media files (gitignored)
├── db-data/                 # Local DB data (gitignored)
├── .env                     # Environment variables (gitignored)
├── pnpm-workspace.yaml      # pnpm workspace + dependency catalog
├── tsconfig.base.json       # Shared TypeScript base config
└── package.json             # Root workspace scripts
```

---

## Environment Variables Reference

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://kali@localhost:5432/cyberlearn` |
| `SESSION_SECRET` | Secret used to sign JWT tokens | `a_long_random_string` |
| `PORT` | Port for both the API server and Vite | `5000` |
| `BASE_PATH` | URL base path (use `/` for local dev) | `/` |
| `NODE_ENV` | Environment mode | `development` or `production` |

---

## Useful Commands

```bash
# Typecheck all packages
pnpm run typecheck

# Build everything
pnpm run build

# Push DB schema changes (dev only — no migration files)
pnpm --filter @workspace/db run push

# Regenerate API client after editing openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Typecheck frontend only
pnpm --filter @workspace/cyberlearn run typecheck

# Typecheck API server only
pnpm --filter @workspace/api-server run typecheck
```
