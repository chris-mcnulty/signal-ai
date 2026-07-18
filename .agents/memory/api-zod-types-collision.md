---
name: api-zod types collision fix
description: Why the api-zod index.ts must NOT re-export from ./generated/types, and what happens if it does.
---

# api-zod types re-export collision

## The rule
`lib/api-zod/src/index.ts` must only contain:
```ts
export * from './generated/api';
```
Never add `export * from './generated/types'` or `export type * from './generated/types'`.

## Why
Orval's `zod` output with `schemas: { path: "generated/types", type: "typescript" }` generates:
- Zod schema constants in `generated/api.ts` (e.g. `export const GetAnalyticsArticleParams = zod.object(...)`)
- TypeScript interfaces in `generated/types/*.ts` (e.g. `export type GetAnalyticsArticleParams = { id: number }`)

When an endpoint has BOTH path params AND query params, orval generates the SAME symbol name in both outputs. Wildcard re-exporting both (`export *` or `export type *`) causes TS2308.

## How to apply
- The codegen script in `lib/api-spec/package.json` writes `index.ts` after each orval run — keep it as `export * from './generated/api';\n` only.
- Nothing in the codebase imports TypeScript interfaces from `@workspace/api-zod`; all consumers use Zod schema names from `api.ts`.
- This pattern triggers whenever a new endpoint adds both a `{pathParam}` AND query params.
