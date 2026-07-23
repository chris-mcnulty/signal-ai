import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, LayoutDashboard, Plus, Globe, Sparkles, Mic2, CalendarDays, Images, Users, BarChart3, Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

function BrandLogo() {
  return (
    <span
      style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}
      className="text-[#0B2E59] dark:text-[#a8c7fa]"
    >
      bluetr<span className="text-[#0047AB] dark:text-[#60a5fa]">AI</span>l
    </span>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { logout, isAdmin } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV_LINKS = [
    { href: "/queue", label: "Queue", icon: LayoutDashboard, matchPaths: ["/queue", "/"] },
    { href: "/schedule", label: "Schedule", icon: CalendarDays, matchPaths: ["/schedule"] },
    { href: "/authors", label: "Authors", icon: Users, matchPaths: ["/authors"] },
    { href: "/seo", label: "SEO", icon: Globe, matchPaths: ["/seo"] },
    { href: "/engine", label: "Engine", icon: Sparkles, matchPaths: ["/engine"] },
    { href: "/voice", label: "Voice", icon: Mic2, matchPaths: ["/voice"] },
    { href: "/image-library", label: "Images", icon: Images, matchPaths: ["/image-library"] },
    { href: "/analytics", label: "Analytics", icon: BarChart3, matchPaths: ["/analytics"] },
    ...(isAdmin ? [{ href: "/team", label: "Team", icon: Users, matchPaths: ["/team"] }] : []),
  ];

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary selection:text-white">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="px-4 sm:px-6 h-14 flex items-center gap-3">
          {/* Logo */}
          <Link
            href="/queue"
            className="flex items-center gap-2 font-bold tracking-tight text-lg hover:opacity-80 transition-opacity shrink-0"
          >
            <BrandLogo />
          </Link>

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-0.5 min-w-0 overflow-x-auto">
            {NAV_LINKS.map(({ href, label, icon: Icon, matchPaths }) => {
              const isActive = matchPaths.some((p) => location === p);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative h-9 px-3 inline-flex items-center gap-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
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

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              asChild
              className="hidden sm:inline-flex gap-1.5 shadow-sm font-semibold"
            >
              <Link href="/drafts/new">
                <Plus className="w-4 h-4" />
                New Draft
              </Link>
            </Button>

            {/* Mobile: compact new draft */}
            <Button
              variant="default"
              size="icon"
              asChild
              className="sm:hidden w-8 h-8 shadow-sm"
              title="New Draft"
            >
              <Link href="/drafts/new">
                <Plus className="w-4 h-4" />
              </Link>
            </Button>

            <div className="w-px h-5 bg-border hidden sm:block" />

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <div className="w-px h-5 bg-border" />

            {/* Sign out */}
            <button
              onClick={logout}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile hamburger */}
            <div className="w-px h-5 bg-border md:hidden" />
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              aria-label="Open navigation"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon, matchPaths }) => {
              const isActive = matchPaths.some((p) => location === p);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`h-10 px-3 inline-flex items-center gap-2.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "text-foreground bg-secondary border-l-2 border-primary pl-[10px]"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
