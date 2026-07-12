import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/lib/auth";
import type { EditorStatus } from "@/lib/auth";

export default function Home() {
  const { isLoggedIn, editorStatus, login } = useAuth();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        const data = await res.json() as { email: string; id: number };
        login(key, data.email, "approved" as EditorStatus);
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
        <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
          <input
            type="password"
            placeholder="Enter your editor key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            autoFocus
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
