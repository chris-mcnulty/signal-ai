import { Link, useLocation } from "wouter";
import { Search, Menu, X, WifiOff, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useListArticles } from "@workspace/api-client-react";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function NetworkError({
  onRetry,
  backHref,
  backLabel = "Return to Front Page",
}: {
  onRetry: () => void;
  backHref: string;
  backLabel?: string;
}) {
  return (
    <div className="broadsheet-theme min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 text-accent opacity-60">
        <WifiOff size={40} strokeWidth={1.5} />
      </div>
      <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-4">
        Connection Error
      </div>
      <hr className="border-t-4 border-black mb-6 w-16 mx-auto" />
      <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-news-primary">
        Unable to Load
      </h1>
      <p className="text-news-secondary font-serif text-lg mb-10 max-w-sm leading-relaxed">
        The server didn't respond in time. Check your connection and try again.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest bg-[#1a1a1a] text-white px-5 py-2.5 hover:bg-accent transition-colors duration-200"
        >
          <RotateCcw size={14} />
          Try Again
        </button>
        <Link
          href={backHref}
          className="font-mono text-sm uppercase tracking-widest text-news-primary border border-news px-5 py-2.5 hover:border-[#1a1a1a] transition-colors duration-200"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  const { data: articles } = useListArticles(
    {},
    { query: { enabled: open, staleTime: 60_000 } },
  );

  const results = useMemo(() => {
    if (!articles || !debouncedQuery.trim()) return null;
    const q = debouncedQuery.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.dek.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [articles, debouncedQuery]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`search-overlay${open ? " open" : ""}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-hidden={!open}
      aria-modal={open}
      role="dialog"
      aria-label="Search"
    >
      <div className="w-full max-w-2xl px-6">
        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-xs uppercase tracking-widest text-news-secondary">Search SignalAI</span>
          <button
            className="mobile-menu-btn text-news-primary"
            onClick={onClose}
            aria-label="Close search"
          >
            <X size={22} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="search"
          placeholder="Search articles…"
          aria-label="Search articles"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="search-results" aria-live="polite">
          {!debouncedQuery.trim() && (
            <p className="font-mono text-xs text-news-secondary mt-6 uppercase tracking-wider">
              Start typing to search articles
            </p>
          )}

          {debouncedQuery.trim() && results && results.length === 0 && (
            <div className="search-empty-state">
              <span className="search-empty-icon">◌</span>
              <p className="search-empty-heading">No results for &ldquo;{debouncedQuery}&rdquo;</p>
              <p className="search-empty-sub">Try a different keyword or browse the front page.</p>
            </div>
          )}

          {results && results.length > 0 && (
            <ul className="search-result-list" role="list">
              {results.map((article) => (
                <li key={article.slug} className="search-result-item">
                  <Link
                    href={`/articles/${article.slug}`}
                    onClick={onClose}
                    className="search-result-link"
                    aria-label={`${article.title} — ${article.category}`}
                  >
                    <span className="search-result-category">{article.category}</span>
                    <span className="search-result-title">{article.title}</span>
                    <span className="search-result-dek">{article.dek}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="font-mono text-xs text-news-secondary mt-6 uppercase tracking-wider">
          Press Esc to close
        </p>
      </div>
    </div>
  );
}

export function useSearch() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setSearchOpen(false);
  }, [location]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  return { searchOpen, openSearch, closeSearch };
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
];

function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [location, navigate] = useLocation();

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="left"
        className="bg-news border-r-4 border-news p-0 w-72 sm:max-w-72 flex flex-col"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-news">
          <span className="font-serif text-2xl font-black tracking-tight">
            Signal<span className="text-accent">AI</span>
          </span>
          <SheetClose asChild>
            <button
              className="mobile-menu-btn text-news-primary"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </SheetClose>
        </div>

        <nav className="flex flex-col flex-1 px-6 py-8 gap-1" role="navigation" aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const isActive = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`font-mono text-sm uppercase tracking-widest px-3 py-3 border-b border-news transition-colors duration-150 ${
                  isActive
                    ? "text-accent font-bold"
                    : "text-news-primary hover:text-accent"
                }`}
                data-testid={`nav-drawer-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-5 border-t border-news">
          <p className="font-mono text-xs text-news-secondary uppercase tracking-widest leading-relaxed">
            Separating the signal<br />from the AI noise
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { searchOpen, openSearch, closeSearch } = useSearch();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className={`site-header border-b-4 border-news px-6 md:px-12 flex flex-col items-center bg-news sticky top-0 z-50${scrolled ? " scrolled" : ""}`}
      >
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-1 w-1/3">
            <button
              className="mobile-menu-btn text-news-primary"
              data-testid="btn-menu"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <button
              className="mobile-menu-btn text-news-primary"
              data-testid="btn-search"
              aria-label="Open search"
              onClick={openSearch}
            >
              <Search size={22} />
            </button>
          </div>

          <div className="w-1/3 text-center">
            <Link
              href="/"
              className="inline-flex flex-col items-center hover:opacity-80 transition-opacity"
              data-testid="link-home"
            >
              <img
                src="/logo.svg"
                alt="SignalAI"
                className="h-10 md:h-12 w-auto"
              />
            </Link>
            <p className="header-tagline font-mono text-xs mt-1 text-news-secondary uppercase tracking-widest hidden md:block">
              Separating the signal from the AI noise
            </p>
          </div>

          <div className="w-1/3 flex justify-end">
            <button className="subscribe-cta" data-testid="btn-subscribe">
              Subscribe
            </button>
          </div>
        </div>
      </header>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={closeSearch} />
    </>
  );
}

export function Footer() {
  return (
    <footer className="bg-black text-white py-12 px-6 md:px-12 mt-12">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
          <h2 className="font-serif text-3xl font-black tracking-tight mb-1">
            Signal<span className="text-accent">AI</span>
          </h2>
          <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">
            © {new Date().getFullYear()} SignalAI Media
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 font-mono text-sm uppercase tracking-wider">
          <Link
            href="/about"
            className="hover:text-accent transition-colors"
            data-testid="link-about"
          >
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="broadsheet-theme">
      {children}
    </div>
  );
}
