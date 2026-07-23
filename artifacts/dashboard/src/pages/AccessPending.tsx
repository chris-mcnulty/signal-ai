import { useAuth } from "@/lib/auth";

export default function AccessPending() {
  const { editorEmail, logout } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="px-6 h-16 flex items-center border-b border-border/50">
        <div className="flex items-center gap-2 font-bold tracking-tight text-lg">
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }} className="text-[#0B2E59] dark:text-[#a8c7fa]">bluetr<span className="text-[#0047AB] dark:text-[#60a5fa]">AI</span>l</span>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto w-full">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-8 mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
          Access Pending
        </h1>
        <p className="text-muted-foreground mb-2 text-balance">
          Your account{editorEmail ? <> (<span className="font-medium text-foreground">{editorEmail}</span>)</> : ""} isn't on the editor allowlist yet.
        </p>
        <p className="text-sm text-muted-foreground mb-8 text-balance">
          Ask an administrator to approve your email address. Once approved, sign in again to access the dashboard.
        </p>
        <button
          onClick={logout}
          className="h-10 px-6 border border-border hover:bg-muted text-foreground text-sm font-medium rounded-md inline-flex items-center justify-center transition-colors"
        >
          Sign out
        </button>
      </main>
    </div>
  );
}
