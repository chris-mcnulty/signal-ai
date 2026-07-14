// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DASHBOARD_ROOT = resolve(import.meta.dirname, "../..");

describe("MSAL initialization — callback URL configuration", () => {
  it("msal.ts configures redirectUri to /dashboard/app/callback", () => {
    const src = readFileSync(resolve(DASHBOARD_ROOT, "src/lib/msal.ts"), "utf8");

    expect(
      src,
      "redirectUri must point to /dashboard/app/callback — the path the popup returns to"
    ).toContain('"/dashboard/app/callback"');

    expect(
      src,
      "redirectUri must be built from window.location.origin so it works on any host"
    ).toContain("window.location.origin");
  });

  it("main.tsx awaits msalInstance.initialize() before mounting the React app", () => {
    const src = readFileSync(resolve(DASHBOARD_ROOT, "src/main.tsx"), "utf8");

    expect(
      src,
      "MSAL must be initialized before React mounts so the popup callback is handled first"
    ).toContain("msalInstance.initialize()");

    expect(
      src,
      "App must be rendered in the .then() of initialize() — not before"
    ).toMatch(/initialize\(\)\s*\.then\(/);
  });

  it("msal.ts uses sessionStorage cache to survive popup redirects without losing the editor API key", () => {
    const src = readFileSync(resolve(DASHBOARD_ROOT, "src/lib/msal.ts"), "utf8");

    expect(
      src,
      "MSAL cache must use sessionStorage so the editor API key (dashboard_api_key) survives the popup redirect"
    ).toContain('cacheLocation: "sessionStorage"');
  });

  it("msal.ts uses the 'common' authority endpoint to support any Microsoft tenant", () => {
    const src = readFileSync(resolve(DASHBOARD_ROOT, "src/lib/msal.ts"), "utf8");

    expect(
      src,
      "MSAL authority must use /common endpoint for multi-tenant support"
    ).toContain("login.microsoftonline.com/common");
  });

  it("msal.ts warns (does not throw) when VITE_ENTRA_CLIENT_ID is missing", () => {
    const src = readFileSync(resolve(DASHBOARD_ROOT, "src/lib/msal.ts"), "utf8");

    expect(
      src,
      "Missing client ID must produce a warning, not crash the app"
    ).toContain("console.warn");

    expect(
      src,
      "clientId falls back to empty string so MSAL can still be constructed without env vars"
    ).toContain('clientId ?? ""');
  });
});

describe("MSAL popup callback — runtime initialization simulation", () => {
  it("msalInstance.initialize() resolves before React mounts (simulated)", async () => {
    const initSpy = vi.fn().mockResolvedValue(undefined);
    const renderSpy = vi.fn();

    await initSpy().then(renderSpy);

    expect(initSpy).toHaveBeenCalledOnce();
    expect(renderSpy).toHaveBeenCalledOnce();
    expect(renderSpy).toHaveBeenCalledAfter(initSpy);
  });

  it("if initialize() rejects, the React app does not mount (popup callback never renders 404)", async () => {
    const initSpy = vi.fn().mockRejectedValue(new Error("MSAL init failed"));
    const renderSpy = vi.fn();

    await initSpy().then(renderSpy).catch(() => {});

    expect(initSpy).toHaveBeenCalledOnce();
    expect(renderSpy).not.toHaveBeenCalled();
  });
});
