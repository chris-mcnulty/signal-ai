import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/lib/auth";
import type { EditorStatus } from "@/lib/auth";
import { msalInstance, loginRequest } from "@/lib/msal";

export default function Home() {
  const { isLoggedIn, editorStatus, login } = useAuth();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [msalLoading, setMsalLoading] = useState(false);

  if (isLoggedIn && editorStatus === "approved") {
    return <Redirect to="/queue" />;
  }

  if (isLoggedIn && editorStatus === "pending") {
    return <Redirect to="/access-pending" />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "x-api-key": key },
      });

      if (res.ok) {
        const data = await res.json() as { email: string; id: number; isAdmin: boolean };
        login(key, data.email, "approved" as EditorStatus, data.isAdmin);
      } else if (res.status === 401) {
        setError("Invalid API key. Check your editor key and try again.");
      } else if (res.status === 403) {
        const body = await res.json().catch(() => ({})) as { code?: string };
        if (body.code === "EDITOR_NOT_APPROVED") {
          login(key, "", "pending" as EditorStatus);
        } else {
          setError("Access denied. Contact an administrator.");
        }
      } else {
        setError("Could not reach the server. Try again.");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMicrosoftLogin() {
    setError("");
    setMsalLoading(true);
    try {
      // Use full-page redirect instead of popup. Popup flows break on iOS
      // Safari (opens in a new tab with no window.opener, so MSAL cannot
      // postMessage back to the login page). loginRedirect navigates the
      // current page to Microsoft; on return, main.tsx exchanges the token
      // and navigates to /dashboard/ with auth already set in sessionStorage.
      await msalInstance.loginRedirect(loginRequest);
      // Page is navigating away — execution does not continue past this point.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      try {
        void fetch("/api/auth/debug-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage: "login-redirect-threw",
            errMsg: msg.slice(0, 300),
            ua: navigator.userAgent.slice(0, 120),
          }),
        }).catch(() => {});
      } catch {
        // diagnostics only
      }
      if (msg.includes("VITE_ENTRA_CLIENT_ID") || msg.includes("clientId")) {
        setError("Microsoft sign-in is not configured yet. Use your editor key instead.");
      } else {
        setError("Microsoft sign-in failed. Try again or use your editor key.");
      }
      setMsalLoading(false);
    }
    // No finally block — if loginRedirect succeeds the page navigates away
    // and setMsalLoading(false) would be a no-op on an unmounted component.
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary selection:text-white">
      <header className="px-6 h-16 flex items-center border-b border-border/50">
        <div className="flex items-center gap-2 font-bold tracking-tight text-lg">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          SignalAI
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto w-full">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-8 mx-auto">
          <div className="w-4 h-4 bg-primary rounded-sm"></div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          The Editorial Desk
        </h1>
        <p className="text-lg text-muted-foreground mb-8 text-balance">
          Separate the signal from the AI noise. A high-density control center for reviewing, editing, and scheduling content.
        </p>

        {/* Microsoft SSO */}
        <div className="w-full max-w-sm flex flex-col gap-3 mb-6">
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msalLoading || loading}
            className="h-10 px-4 bg-[#0078d4] hover:bg-[#106ebe] disabled:opacity-50 text-white font-medium rounded-md inline-flex items-center justify-center gap-2.5 transition-colors text-sm"
          >
            {msalLoading ? (
              "Signing in…"
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 23 23" fill="none" aria-hidden="true">
                  <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                  <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                  <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
                  <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
                </svg>
                Sign in with Microsoft
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="w-full max-w-sm flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">or use editor key</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* API key fallback */}
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
          <input
            type="password"
            placeholder="Enter your editor key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            className="h-10 px-3 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key}
            className="h-10 px-8 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-medium rounded-md inline-flex items-center justify-center transition-colors"
          >
            {loading ? "Checking…" : "Access Dashboard"}
          </button>
        </form>
      </main>
    </div>
  );
}
