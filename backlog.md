# Backlog — Design / UX & Tech Debt

Open items from the design & professionalism review. Grouped by type and
roughly ordered by impact within each group. File references are pointers, not
exhaustive.

_Last updated: 2026-07-21. Context: follow-up to the design-enhancements work on
branch `claude/design-enhancements-analysis-9g1g39` (commits `4778ed9`,
`d0b2f6b`). Items already shipped there are listed under "Done for context" at
the bottom._

---

## Deferred enhancements (design / UX)

### 1. Consolidate the three article-body renderers
**Priority: high.** The body of long-form content is rendered three different
ways, so identical markup produces different output depending on content type:
- `artifacts/site/src/pages/article.tsx` — full renderer: HTML-body detection +
  sanitizer, markdown headings/lists/blockquotes, inline `**bold**`/`*italic*`/
  `[links]`, drop-cap.
- `artifacts/site/src/pages/case-study.tsx` — **minimal** renderer: only `## `
  headings, `> ` blockquotes, drop-cap, plain paragraphs. No bold/italic/inline
  links/lists and **no HTML handling** (an HTML-bodied case study renders as
  literal tag text).
- `artifacts/site/src/pages/spotlight.tsx` — uses `react-markdown` (a third
  strategy).

**Action:** extract a single `ArticleBody` component (superset: the article.tsx
logic) and use it in all three. **Why deferred:** touches the core reading
experience with subtle behaviors (drop-cap, HTML sanitize, markdown edge cases,
spotlight's `react-markdown`) and has essentially no unit-test coverage; the
Playwright e2e can't run without a live server + Postgres. Do this in a session
where the e2e suite runs, and eyeball real content before/after.

### 2. Resolve the case-study SSR-vs-SPA duplication (architectural)
**Priority: high, but needs a product/infra decision.** `/case-studies` and
`/case-studies/:slug` exist twice with different designs — the React SPA
(`artifacts/site/src/pages/case-study*.tsx`) and the server-rendered pages
(`artifacts/api-server/src/pages/caseStudyPages.ts` + `layout.ts`). The
duplication is **intentional and parity-tested** (`e2e/case-study-ssr-spa-parity.spec.ts`),
so this is not a delete — it's a decision about which surface is canonical
(SSR is documented as the SEO-canonical one in `replit.md`) and how the SPA
should link to it. **Why deferred:** proxy-routing / SEO decision that needs an
owner, plus parity e2e must pass against the live stack.

### 3. Content-discovery layer
**Priority: medium-high.** Once a reader finishes a piece there's no onward
path beyond global nav:
- No "read next" / related-articles rail on article & spotlight pages (case
  studies already have `relatedArticles`).
- Category pages (`CategoryPage`) have no pagination, filtering, or tag nav —
  they render a flat featured + list.
- Tags aren't a real feature (the article page now links only its category;
  there is no `tags` column — see `lib/db/src/schema/articles.ts`).

**Action:** related-content rails, pagination for growing archives, and (if
desired) a real tags model.

### 4. Ship dark mode or remove the dead theme
**Priority: medium.** A complete `.dark` token palette exists
(`artifacts/site/src/index.css`) but is never activated — `.broadsheet-theme`
hard-codes light values and there is no toggle or `prefers-color-scheme` wiring.
Either wire a real toggle + system-preference support, or delete the dead
palette. Shipping unused theme CSS is a maintenance smell.

### 5. Accessibility & polish pass (remaining)
**Priority: medium.**
- **Non-descriptive alt text:** hero images use `alt={title}` (title-as-alt);
  decorative images should use empty `alt`. (`article.tsx`, `case-study.tsx`,
  `spotlight.tsx`, category cards.)
- **No global focus-visible styles:** the site relies on browser defaults for
  link/button focus rings; add consistent `:focus-visible` styling.
- **`NetworkError` replaces the whole page** including nav
  (`artifacts/site/src/components/layout.tsx`) — on a list-page fetch failure
  the user loses global navigation.
- **Muted-on-cream contrast** (`--muted-foreground`) is borderline for AA body
  text; audit and darken where needed.
- **CLS risk:** entrance animations (`animate-fade-in-up` + `delay-*`) can shift
  layout on slow loads.

### 6. Category color coding
**Priority: low.** All category badges use the single accent blue; readers can't
distinguish News/Opinion/Use-Cases at a glance. Consider a per-category accent.

---

## Known issues / bugs / tech debt

### 7. Pre-existing `queryKey` typecheck errors
**Priority: high if CI gates on typecheck.** `tsc` reports `queryKey` missing on
`useQuery` options in several files not touched by recent work:
`artifacts/site/src/pages/{news,opinion,case-studies,spotlights,author}.tsx` and
`components/layout.tsx` (SearchOverlay). Present on `main` (baseline), so likely
react-query version drift rather than a code defect. **Action:** if the PR's CI
goes red on these, add the generated `getList*QueryKey()` to the list-hook call
sites (and equivalent for `author`'s hooks). Left untouched for now to avoid
speculative churn.

### 8. `correct-british-english` script references a non-existent column
**Priority: medium.** `scripts/src/correct-british-english.ts:51` reads
`articlesTable.excerpt`, but the `articles` schema has no `excerpt` column
(`lib/db/src/schema/articles.ts`) — `tsc` errors on it. Pre-existing. Fix the
script (use the correct field) or add the column.

### 9. `author.tsx` fails silently on the articles query
**Priority: medium.** `useListAuthorArticles` is destructured without `isError`
(`artifacts/site/src/pages/author.tsx:47`), so if that fetch fails the article
list section just renders empty with no error/retry affordance (only the author
query has `isError` handling). Add error handling + a styled empty state
consistent with the list pages.

### 10. Redundant nav drawer / subscribe modal on `privacy.tsx`
**Priority: low.** `privacy.tsx` renders the shared `Header` (which owns its own
`NavDrawer`/`SubscribeModal`) *and* a second standalone `NavDrawer` +
`SubscribeModal`. The second set is effectively dead. Remove the duplication.

### 11. Metric-grid border logic edge case (SPA case study)
**Priority: low.** `case-study.tsx` computes cell borders from index parity
(`isLastRow`/`isLastCol`) assuming clean 3-column rows; counts that aren't a
multiple of 3 can mis-draw internal borders. Prefer a CSS-grid gap/hairline
approach.

### 12. Orphan old-brand logo assets
**Priority: low (cosmetic).** `logo-square-ai.svg`, `logo-square-sai.svg`,
`logo-square.svg` (in `artifacts/site/public/` and
`artifacts/api-server/public/static/`) still carry `<title>`/`aria-label`
"SignalAI" and use the retired red-orange accent. They are **not referenced**
anywhere, so harmless — delete them or relabel/redraw if they'll be used.

---

## Operational follow-ups

### 13. Run the legacy-byline data migration (write access required)
Replit observes the DBs read-only, so these must run as a deploy step by an
operator with write access:
```
pnpm --filter @workspace/db run push                          # apply author-default change
pnpm --filter @workspace/scripts run migrate-legacy-byline    # rewrite "SignalAI Staff" rows
```
Not a correctness dependency — the render-time byline fallback
(`displayAuthor`/`displayByline`) already prevents readers from seeing the old
name. The migration is idempotent (re-runs update 0 rows).

---

## Done for context (shipped on the feature branch)

- Article share controls wired (X/LinkedIn/native-share+copy); dead bookmark
  removed; fake tags replaced with a real category link.
- Subscribe reachable from every page via a `NavDrawer` CTA (previously the
  modal was unreachable on the four detail pages).
- Footer text contrast fixed to WCAG AA.
- `SubscribeModal` a11y: dialog roles, Escape-to-close, scroll-lock, focus
  management, labelled input, focus ring, `aria-live` status.
- Brand sweep: `articles.author` default → "BlueTrail Staff"; render-time
  legacy-byline fallback (React + SSR); retired `signalai-logo.png` replaced
  (favicon + Organization JSON-LD logo).
- Shared `DetailHeader` + `Footer` across article/case-study/spotlight/author
  (replaced 4 hand-rolled headers + 3 mini-footers).
- Shared `CategoryPage` — news/opinion/use-cases reduced to thin wrappers.
