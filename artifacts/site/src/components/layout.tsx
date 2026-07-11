import { Link } from "wouter";
import { Search, Menu } from "lucide-react";

export function Header() {
  return (
    <header className="border-b-4 border-news py-4 px-6 md:px-12 flex items-center justify-between animate-fade-in-up bg-news sticky top-0 z-50">
      <div className="flex items-center gap-4 w-1/3">
        <button className="hover-dim text-news-primary" data-testid="btn-menu"><Menu size={24} /></button>
        <button className="hover-dim text-news-primary" data-testid="btn-search"><Search size={24} /></button>
      </div>
      <div className="w-1/3 text-center">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity" data-testid="link-home">
          <h1 className="font-serif text-4xl md:text-6xl font-black tracking-tight text-news-primary">
            Signal<span className="text-accent">AI</span>
          </h1>
        </Link>
        <p className="font-mono text-xs md:text-sm mt-2 text-news-secondary uppercase tracking-widest hidden md:block">
          Separating the signal from the AI noise
        </p>
      </div>
      <div className="w-1/3 flex justify-end">
        <button className="bg-news border border-news text-news-primary px-4 py-2 font-mono text-sm uppercase tracking-wider hover:bg-black hover:text-white transition-colors duration-300" data-testid="btn-subscribe">
          Subscribe
        </button>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-black text-white py-12 px-6 md:px-12 mt-12">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center">
        <div>
          <h2 className="font-serif text-3xl font-black tracking-tight mb-2">Signal<span className="text-accent">AI</span></h2>
          <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">© {new Date().getFullYear()} SignalAI Media</p>
        </div>
        <div className="flex gap-8 font-mono text-sm uppercase tracking-wider mt-8 md:mt-0">
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
