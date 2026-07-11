---
name: Env vars are committed to the repo
description: Why sensitive values must be Replit Secrets, not env vars, in this project.
---

- Setting an env var in the `shared` or `development` environment writes it into `.replit` under `[userenv.*]`, and `.replit` is committed to the repo — so any key/token stored that way is a secret-in-repo leak (code review blocks on it).
  **Why:** Discovered when a minted API key placed in a shared env var appeared verbatim in `.replit` and was rejected by review; the key had to be treated as exposed and rotated.
  **How to apply:** For anything sensitive (API keys, tokens), use `requestEnvVar({ requestType: "secret", ... })` so the user stores it as a Replit Secret. Env vars are fine only for non-sensitive config.
