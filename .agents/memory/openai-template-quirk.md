---
name: OpenAI template typecheck fix
description: Known TS error in the ai-integrations-openai server template with openai SDK v6.
---

- Copying the `ai-integrations-openai` template's server package breaks `pnpm --filter @workspace/api-spec run codegen` (which runs `typecheck:libs`): the image client accesses `response.data[0]` but openai SDK v6 types `data` as possibly undefined.
  **Why:** SDK typing changed; the template wasn't updated. Occurs in both image functions in `image/client.ts`.
  **How to apply:** After copying the template, change to `response.data?.[0]?.b64_json ?? ""` (two occurrences) before running codegen.
