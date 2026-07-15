---
name: MSAL v5 redirect handling
description: navigateToLoginRequestUrl moved from auth config to handleRedirectPromise options in msal-browser v5
---

## Rule

In `@azure/msal-browser` v5, `auth.navigateToLoginRequestUrl` in the MSAL
Configuration is silently ignored. It must be passed per-call:
`handleRedirectPromise({ navigateToLoginRequestUrl: false })`.

**Why:** Without it, the default (`true`) makes MSAL full-page navigate back
to the page where `loginRedirect` was called and return a promise that NEVER
resolves on the callback page. Symptom: callback page mounts with the auth
code in the URL hash, but `handleRedirectPromise()` neither resolves nor
throws — the user is silently bounced back to the login screen and zero
requests reach the backend. Diagnosed via client debug beacons
(`/api/auth/debug-log`) in production.

**How to apply:** Every `handleRedirectPromise()` call site (callback page
AND any startup drain) must pass `{ navigateToLoginRequestUrl: false }` if
the app owns its own post-login navigation.
