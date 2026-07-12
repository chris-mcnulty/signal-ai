---
name: Entra SSO login
description: How Microsoft Entra SSO is integrated into the dashboard login — what changed, what stayed the same, and env var requirements.
---

# Entra SSO Login

## What changed
- Dashboard `Home.tsx` replaced API key input form with a "Sign in with Microsoft" button using MSAL popup flow (`@azure/msal-browser`).
- New `POST /api/auth/microsoft` endpoint on the API server verifies the Entra ID token (via `jwks-rsa` + `jsonwebtoken`) and returns the editor's `api_key` from the `editors` table.
- `AuthProvider` logout now also calls `msalInstance.logoutPopup()` to clear the Microsoft session.

## What stayed the same
- `requireEditor` and `apiKeyAuth` middleware are untouched — API keys still authenticate all downstream dashboard API calls.
- `sessionStorage` keys (`dashboard_api_key`, `dashboard_editor_email`, `dashboard_editor_status`) are unchanged.
- `/api/auth/me` still works for programmatic key validation.

## Authorization model
- Any Microsoft account can attempt login (multi-tenant: `ENTRA_TENANT_ID=common`).
- Authorization is still gated by the `editors` table — email must match an active row.
- Editors not in the table or with `is_active=false` get `403 EDITOR_NOT_APPROVED`.

## Environment variables required
- API server: `ENTRA_CLIENT_ID` (secret), `ENTRA_TENANT_ID` (secret, default `common`)
- Dashboard Vite build: `VITE_ENTRA_CLIENT_ID` (shared env var), `VITE_ENTRA_TENANT_ID` (shared env var)
- Both sets must match — the JWKS endpoint is derived from the tenant ID.

**Why separate secrets and VITE_ vars:** Vite embeds `VITE_*` into the JS bundle at build time. The server reads from env secrets at runtime. Same values, different access paths.

## Key files
- `artifacts/dashboard/src/lib/msal.ts` — MSAL config and instance
- `artifacts/dashboard/src/lib/auth.tsx` — AuthProvider with MSAL logout
- `artifacts/dashboard/src/pages/Home.tsx` — Sign in with Microsoft button
- `artifacts/api-server/src/routes/auth.ts` — `POST /api/auth/microsoft` endpoint
