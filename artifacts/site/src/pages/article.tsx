import React from 'react';
import { useRoute, Link } from 'wouter';
import { Search, Menu, ArrowLeft, Share2, Bookmark, Twitter, Linkedin } from 'lucide-react';
import { useGetArticle, getGetArticleQueryKey } from '@workspace/api-client-react';

export default function ArticlePage() {
  const [, params] = useRoute("/articles/:slug");
  const slug = params?.slug || "";

  const { data: article, isLoading } = useGetArticle(slug, { 
    query: { 
      enabled: !!slug, 
      queryKey: getGetArticleQueryKey(slug) 
    } 
  });

  if (isLoading) {
    return (
      <div className="broadsheet-theme min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 max-w-[800px] w-full px-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-16 bg-gray-200 rounded w-full"></div>
          <div className="h-64 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="broadsheet-theme min-h-screen flex flex-col items-center justify-center">
        <h1 className="font-serif text-4xl font-bold mb-4">Article Not Found</h1>
        <Link href="/" className="font-mono uppercase text-accent tracking-widest hover:underline">Return to Home</Link>
      </div>
    );
  }

  const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const bodyParagraphs = article.body.split('\n\n').filter(p => p.trim() !== '');

  return (
    <div className="broadsheet-theme">
      {/* Header (Slimmer for article) */}
      <header className="border-b border-news py-3 px-6 md:px-12 flex items-center justify-between sticky top-0 bg-news/95 backdrop-blur z-50">
        <div className="flex items-center gap-4 w-1/3">
          <Link href="/" className="hover-dim text-news-primary flex items-center gap-2 font-mono text-xs uppercase tracking-wider" data-testid="link-back-home">
            <ArrowLeft size={16} /> Home
          </Link>
        </div>
        <div className="w-1/3 text-center">
          <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
            <h1 className="font-serif text-2xl font-black tracking-tight text-news-primary">
              Signal<span className="text-accent">AI</span>
            </h1>
          </Link>
        </div>
        <div className="w-1/3 flex justify-end gap-4">
          <button className="hover-dim text-news-primary"><Search size={20} /></button>
          <button className="hover-dim text-news-primary"><Menu size={20} /></button>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-6 py-12 md:py-20">
        
        {/* Article Header */}
        <header className="mb-12 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <span className="font-mono text-xs font-bold uppercase text-accent tracking-widest border border-accent px-2 py-1">{article.category}</span>
            <span className="font-mono text-xs text-news-secondary uppercase">{publishedDate} • {article.readingMinutes} min read</span>
          </div>
          
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            {article.title}
          </h1>
          
          <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed mb-8">
            {article.dek}
          </p>

          <div className="flex items-center justify-between border-t border-b border-news py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden border border-news">
                <div className="w-full h-full bg-gray-400 flex items-center justify-center font-mono text-lg text-white">
                  {article.author.charAt(0)}
                </div>
              </div>
              <div>
                <div className="font-sans font-bold text-sm">{article.author}</div>
                <div className="font-mono text-xs text-news-secondary uppercase tracking-wider">Author</div>
              </div>
            </div>
            
            <div className="flex gap-3 text-news-secondary">
              <button className="p-2 border border-transparent hover:border-news rounded-full transition-colors" data-testid="btn-share-twitter"><Twitter size={18} /></button>
              <button className="p-2 border border-transparent hover:border-news rounded-full transition-colors" data-testid="btn-share-linkedin"><Linkedin size={18} /></button>
              <button className="p-2 border border-transparent hover:border-news rounded-full transition-colors" data-testid="btn-bookmark"><Bookmark size={18} /></button>
              <button className="p-2 border border-transparent hover:border-news rounded-full transition-colors" data-testid="btn-share"><Share2 size={18} /></button>
            </div>
          </div>
        </header>

        {/* Hero Image */}
        {article.heroImageUrl && (
          <figure className="w-full mb-12 animate-fade-in-up delay-100">
            <div className="aspect-[16/9] w-full bg-gray-200 overflow-hidden mb-3">
              <img 
                src={article.heroImageUrl} 
                alt={article.title} 
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="font-mono text-xs text-news-secondary text-right">
              SignalAI Media
            </figcaption>
          </figure>
        )}

        {/* Article Body */}
        <div className="article-body font-sans text-news-primary animate-fade-in-up delay-200">
          {bodyParagraphs.map((paragraph, index) => {
            if (index === 0) {
               return (
                 <p key={index} className="first-letter:font-serif first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-[-0.1em] first-letter:text-accent">
                   {paragraph}
                 </p>
               )
            }
            if (paragraph.startsWith('## ')) {
               return <h2 key={index}>{paragraph.replace('## ', '')}</h2>
            }
            if (paragraph.startsWith('> ')) {
               return <blockquote key={index}>{paragraph.replace('> ', '')}</blockquote>
            }
            return <p key={index}>{paragraph}</p>
          })}
        </div>
        
        {/* Source Links */}
        {article.sourceUrls && article.sourceUrls.length > 0 && (
          <div className="mt-12 pt-6 border-t border-news animate-fade-in-up delay-300">
            <h3 className="font-mono text-sm font-bold uppercase tracking-widest mb-4">Sources</h3>
            <ul className="space-y-2">
              {article.sourceUrls.map((url, i) => (
                <li key={i}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-accent hover:underline break-all">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        <div className="mt-12 pt-6 border-t border-news flex flex-wrap gap-2 animate-fade-in-up delay-300">
          <span className="font-mono text-xs uppercase border border-border-color px-3 py-1 hover:bg-news-primary hover:text-white cursor-pointer transition-colors">{article.category}</span>
          <span className="font-mono text-xs uppercase border border-border-color px-3 py-1 hover:bg-news-primary hover:text-white cursor-pointer transition-colors">AI Industry</span>
          <span className="font-mono text-xs uppercase border border-border-color px-3 py-1 hover:bg-news-primary hover:text-white cursor-pointer transition-colors">Analysis</span>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-black text-white py-8 px-6 md:px-12 text-center mt-20">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <h2 className="font-serif text-2xl font-black tracking-tight mb-4 opacity-50 cursor-pointer">SignalAI</h2>
        </Link>
        <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">© {new Date().getFullYear()} SignalAI Media. All rights reserved.</p>
      </footer>

    </div>
  );
}
