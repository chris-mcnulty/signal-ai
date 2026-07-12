import { Link } from "wouter";
import { Search, Menu, X, WifiOff, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          autoFocus={open}
          type="search"
          placeholder="Search articles…"
          aria-label="Search articles"
        />
        <p className="font-mono text-xs text-news-secondary mt-4 uppercase tracking-wider">Press Esc to close</p>
      </div>
    </div>
  );
}

export function useSearch() {
  const [searchOpen, setSearchOpen] = useState(false);
  return {
    searchOpen,
    openSearch: () => setSearchOpen(true),
    closeSearch: () => setSearchOpen(false),
  };
}

export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
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
              className="inline-block hover:opacity-80 transition-opacity"
              data-testid="link-home"
            >
              <h1 className="font-serif text-4xl md:text-5xl font-black tracking-tight text-news-primary leading-none">
                Signal<span className="text-accent">AI</span>
              </h1>
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
          <span className="hover:text-accent cursor-pointer transition-colors" data-testid="link-about">About</span>
          <span className="hover:text-accent cursor-pointer transition-colors" data-testid="link-manifesto">Manifesto</span>
          <span className="hover:text-accent cursor-pointer transition-colors" data-testid="link-subscribe-footer">Subscribe</span>
          <span className="hover:text-accent cursor-pointer transition-colors" data-testid="link-contact">Contact</span>
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
