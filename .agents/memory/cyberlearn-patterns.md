---
name: CyberLearn LMS contract-first patterns
description: Key gotchas and decisions for the OpenAPI spec, codegen, and frontend type discipline in CyberLearn
---

## Rules

1. **Always run codegen after editing openapi.yaml**: `pnpm --filter @workspace/api-spec run codegen`. Orval cleans the output folder before writing, so there's a brief moment when files don't exist — this causes HMR errors in Vite, but the next full reload works fine.

2. **listModules returns ModuleWithLessons[]**: The spec was updated to use `ModuleWithLessons` (not `Module`) for the `/courses/{courseId}/modules` GET response, because the backend always JOINs lessons. Pages that display the module tree must type-cast `modules as ModuleWithLessons[]`.

3. **useGetMe requires queryKey**: TanStack Query v5 strict mode requires `queryKey` in the options object even for single-use queries. Use `queryKey: ["getMe"]` in `useGetMe`.

4. **TotpVerifyInput uses `totpCode`** (not `code`). AvatarColorInput uses `color` (not `avatarColor`). SuspendInput requires `data: { isActive: boolean }` as a separate field from `id`.

5. **Express 5 params**: Access via `req.params['id']! as string` pattern throughout — TS strict mode rejects `req.params.id` in Express 5 types.

**Why:** Discovered these by running `pnpm --filter @workspace/cyberlearn run typecheck` which surfaced ~30 errors from schema mismatches between hand-written pages and generated types.

**How to apply:** After any API or page changes, always typecheck with the CLI (not just editor LSP) — it's the source of truth.
