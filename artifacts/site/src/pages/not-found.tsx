import { Link } from "wouter";
import { Layout, Header, Footer } from "@/components/layout";

export default function NotFound() {
  return (
    <Layout>
      <Header />
      <main className="max-w-[800px] mx-auto px-6 py-32 text-center animate-fade-in-up">
        <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-6">Error 404</div>
        <hr className="border-t-4 border-news mb-8 mx-auto w-24" />
        <h1 className="font-serif text-6xl md:text-8xl font-bold leading-none mb-6 text-news-primary">
          Page Not Found
        </h1>
        <p className="text-xl text-news-secondary font-serif leading-relaxed mb-12 max-w-md mx-auto">
          The story you're looking for has moved, been archived, or doesn't exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-accent border border-accent px-6 py-3 hover:bg-accent hover:text-white transition-colors duration-200"
        >
          Return to Front Page
        </Link>
      </main>
      <Footer />
    </Layout>
  );
}
