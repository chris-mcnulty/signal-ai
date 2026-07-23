---
name: Anti-slop pipeline
description: How the no-ai-slop rules are enforced across engine prompts and the detect/polish dashboard tool.
---

## Rule: single source of truth in slop-rules.ts

`artifacts/api-server/src/engine/slop-rules.ts` is the canonical module.
It exports BANNED_WORDS, FILLER_PHRASES, STRUCTURAL_PATTERNS, ANTI_SLOP_SYSTEM_BLOCK, and EVAL_CHECKLIST.
When updating rules, edit this file — other modules consume it.

**Why:** Prevents the rules in the engine prompts, the polish endpoint, and the editorial-style skill from drifting apart.

**How to apply:** Any new banned word or pattern goes in slop-rules.ts first, then flows into context.ts LANGUAGE_STANDARDS automatically via ANTI_SLOP_SYSTEM_BLOCK.

## Endpoint: POST /api/drafts/:id/polish

- Registered in `engine.ts` (not drafts.ts), behind `requireEditor` + `aiRateLimit`
- mode: "detect" returns PolishFinding[] without rewriting
- mode: "polish" returns cleaned body/dek + whatChanged summary; AI runs the EVAL_CHECKLIST internally before returning
- Neither mode auto-saves — caller applies via form.setValue

## Dashboard UI: Writing Check panel

In `DraftEditor.tsx`, below the AI SEO Assist panel.
State: `writingCheckOpen`, `polishResult` (PolishDraftResult | null), `polishMode`.
Handlers: `handleDetect`, `handlePolish`, `handleApplyPolish`.
Apply sets form dirty; editor must save manually.

## Editorial-style skill

`.agents/skills/editorial-style/SKILL.md` was rewritten to reflect BlueTrail branding and include the complete rule set. Consult it whenever generating or reviewing any copy.
