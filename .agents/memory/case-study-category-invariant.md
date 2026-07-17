---
name: Case-study category invariant
description: Category normalization and why case-study visibility must be gated by article category, not just the case_studies join
---

Categories are stored as normalized slugs ("Case Study" → "case-study"); the server normalizes at every draft write point and the dashboard uses a fixed Select.

**Why:** Free-text categories caused a case study to appear in the news feed. Separately, a `case_studies` row can outlive a category change — an article flipped from case-study to news would still show in `/case-studies` if listings only join the table.

**How to apply:** Any public case-study query must filter `articles.category = 'case-study'` in addition to the join. Saving case-study metadata is rejected (409) unless the article's normalized category is case-study. If adding categories, extend the dashboard Select and keep values slug-form.
