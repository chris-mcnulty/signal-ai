---
name: Auth token getter must register at render time
description: Registering the API-client auth getter in a provider useEffect races child query hooks; register synchronously during first render.
---
Rule: `setAuthTokenGetter` must be called synchronously during AuthProvider's first render (guarded by a ref), not only in `useEffect`.

**Why:** React runs child effects before parent effects, so on a direct page load a child page's react-query hook fired its fetch before the provider's effect registered the getter — first request went out without Authorization, got a 401 that react-query never retries, and the page stayed empty.

**How to apply:** Keep the render-time registration plus a mount-effect re-registration (StrictMode remount re-runs effects but not render). Any similar "register a global getter from a provider" pattern needs the same treatment.
