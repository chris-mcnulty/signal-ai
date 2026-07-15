---
name: SignalAI Admin Accounts
description: Policy — permanent full-admin accounts exist for the editorial dashboard; where to find them.
---

## Permanent Admins

Two permanent admin accounts exist (user-stated requirement). Their email
addresses are NOT stored here — look them up in the `editors` table in the
database (rows with admin/active status) when needed.

**Why:** These accounts must always retain full admin access to the editorial
dashboard, regardless of auth system changes.

**How to apply:** When implementing or updating dashboard authentication,
never gate, disable, or remove access for the existing active admin rows in
the `editors` table during any auth refactor.
