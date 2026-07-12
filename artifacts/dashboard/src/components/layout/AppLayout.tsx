import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { LogOut, LayoutDashboard, Plus, PenSquare, Globe, Sparkles, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary selection:text-white">
      <header className="sticky top-0 z-50 px-6 h-14 flex items-center border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <Link href="/queue" className="flex items-center gap-2 font-bold tracking-tight text-lg hover:text-primary transition-colors">
            <div className="w-5 h-5 bg-primary rounded-sm flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
            SignalAI
          </Link>

          <nav className="flex items-center gap-1">
            <Link 
              href="/queue" 
              className={`h-9 px-4 inline-flex items-center gap-2 text-sm font-medium rounded-md transition-colors ${
                location === "/queue" || location === "/" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Queue
            </Link>
            <Link
              href="/seo"
              className={`h-9 px-4 inline-flex items-center gap-2 text-sm font-medium rounded-md transition-colors ${
                location === "/seo" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Globe className="w-4 h-4" />
              SEO
            </Link>
            <Link 
              href="/engine" 
              className={`h-9 px-4 inline-flex items-center gap-2 text-sm font-medium rounded-md transition-colors ${
                location === "/engine" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Engine
            </Link>
            <Link 
              href="/voice" 
              className={`h-9 px-4 inline-flex items-center gap-2 text-sm font-medium rounded-md transition-colors ${
                location === "/voice" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Mic2 className="w-4 h-4" />
              Voice
            </Link>
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <Button variant="default" size="sm" asChild className="gap-2">
            <Link href="/drafts/new">
              <Plus className="w-4 h-4" />
              New Draft
            </Link>
          </Button>

          <div className="w-px h-6 bg-border mx-1"></div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium leading-none">{user?.fullName || user?.primaryEmailAddress?.emailAddress}</span>
              <span className="text-xs text-muted-foreground">Editor</span>
            </div>
            <button
              onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL || "/" })}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
