---
name: GNews API integration
description: Quirks of the GNews v4 API used by the research engine
---

The research engine's news scan uses GNews v4 (`https://gnews.io/api/v4/search`).

- **Auth param is `apikey`, not `token`.** The legacy `token` query param returns `400 {"errors":["You did not provide an API key."]}` — a misleading message that looks like a missing env var. **Why:** GNews renamed the parameter; older examples (including Orbit's original service) still use `token`.
- **How to apply:** If GNews returns "did not provide an API key" while `GNEWS_API_KEY` is set, check the query param name and the key length first (real keys are 32 hex chars; users sometimes paste placeholders).
- The engine intentionally throws (`NewsConfigError` → HTTP 503) when the key is missing — never stub news data.
