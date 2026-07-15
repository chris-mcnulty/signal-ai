import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { msalInstance } from "@/lib/msal";
import { useAuth } from "@/lib/auth";
import type { EditorStatus } from "@/lib/auth";

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleRedirect() {
      try {
        const response = await msalInstance.handleRedirectPromise();

        if (!response?.idToken) {
          // Microsoft sends the auth result in the URL hash. If it's present
          // but MSAL returned null, the request state was lost (e.g. storage
          // cleared during the redirect) — surface that instead of silently
          // bouncing back to the login screen.
          const hash = window.location.hash;
          if (hash.includes("code=") || hash.includes("error=")) {
            setError(
              "Sign-in could not be completed because the browser lost the sign-in state. Please try again.",
            );
            return;
          }
          // No redirect response — direct navigation or already processed.
          navigate("/", { replace: true });
          return;
        }

        const res = await fetch("/api/auth/microsoft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: response.idToken }),
        });

        if (!cancelled) {
          if (res.ok) {
            const data = await res.json() as { apiKey: string; email: string; id: number };
            login(data.apiKey, data.email, "approved" as EditorStatus);
            navigate("/queue", { replace: true });
          } else if (res.status === 403) {
            login("", "", "pending" as EditorStatus);
            navigate("/access-pending", { replace: true });
          } else {
            setError("Sign-in failed. Please try again or use your editor key.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setError(`Sign-in error: ${msg}`);
        }
      }
    }

    handleRedirect();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 gap-4 text-center">
        <p className="text-destructive text-sm max-w-sm">{error}</p>
        <a href="/" className="text-sm text-primary hover:underline">Back to sign in</a>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
