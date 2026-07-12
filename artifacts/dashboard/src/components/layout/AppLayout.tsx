import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, LayoutDashboard, Plus, Globe, Sparkles, Mic2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/queue", label: "Queue", icon: LayoutDashboard, matchPaths: ["/queue", "/"] },
  { href: "/schedule", label: "Schedule", icon: CalendarDays, matchPaths: ["/schedule"] },
  { href: "/seo", label: "SEO", icon: Globe, matchPaths: ["/seo"] },
  { href: "/engine", label: "Engine", icon: Sparkles, matchPaths: ["/engine"] },
  { href: "/voice", label: "Voice", icon: Mic2, matchPaths: ["/voice"] },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary selection:text-white">
      <header className="sticky top-0 z-50 px-6 h-14 flex items-center border-b border-border bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link href="/queue" className="flex items-center gap-2 font-bold tracking-tight text-lg hover:text-primary transition-colors shrink-0">
            <div className="w-5 h-5 bg-primary rounded-sm flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            SignalAI
          </Link>

          <nav className="flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label, icon: Icon, matchPaths }) => {
              const isActive = matchPaths.some((p) => location === p);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative h-9 px-3.5 inline-flex items-center gap-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "text-foreground bg-secondary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Button variant="default" size="sm" asChild className="gap-1.5 shadow-sm font-semibold">
            <Link href="/drafts/new">
              <Plus className="w-4 h-4" />
              New Draft
            </Link>
          </Button>

          <div className="w-px h-5 bg-border" />

          <button
            onClick={logout}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
