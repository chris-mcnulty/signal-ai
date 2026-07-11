import React, { useState, useEffect } from 'react';
import './_grid.css';

// Type definitions for our articles
type Category = 'USE-CASE' | 'NEWS' | 'OPINION' | 'CASE-STUDY';

interface Article {
  id: string;
  title: string;
  excerpt?: string;
  category: Category;
  author: string;
  timestamp: string;
  readTime: string;
  image?: string;
  isHero?: boolean;
}

const ARTICLES: Article[] = [
  {
    id: 'a1',
    title: 'The End of the Zero-Interest AI Era: Why ROI is the Only Metric Left',
    excerpt: 'As compute costs soar and VC patience wanes, enterprise AI deployments are shifting from experimental sandboxes to ruthless efficiency engines. Here is what survives the purge.',
    category: 'OPINION',
    author: 'Sarah Chen',
    timestamp: '2023.10.24 // 14:32Z',
    readTime: '08 MIN',
    image: '/__mockup/images/hero-signal.png',
    isHero: true
  },
  {
    id: 'a2',
    title: 'Agentic Workflows in Global Logistics: Maersk\'s Quiet Deployment',
    excerpt: 'Behind the scenes, multi-agent systems are already routing cargo ships around port bottlenecks with zero human intervention.',
    category: 'CASE-STUDY',
    author: 'David Vance',
    timestamp: '2023.10.23 // 09:15Z',
    readTime: '12 MIN',
    image: '/__mockup/images/logistics-grid.png'
  },
  {
    id: 'a3',
    title: 'OpenAI\'s O1 Pricing Model Forces Enterprise Rethink',
    category: 'NEWS',
    author: 'Elena Rostova',
    timestamp: '2023.10.24 // 18:45Z',
    readTime: '04 MIN'
  },
  {
    id: 'a4',
    title: 'Fine-Tuning Llama 3 for Legal Compliance: A Hard Cost Breakdown',
    excerpt: 'We audited three legal-tech firms who moved off GPT-4 to fine-tuned local models. The cost savings are real, but the maintenance overhead is hiding in plain sight.',
    category: 'USE-CASE',
    author: 'Marcus Thorne',
    timestamp: '2023.10.22 // 11:20Z',
    readTime: '15 MIN',
    image: '/__mockup/images/finance-models.png'
  },
  {
    id: 'a5',
    title: 'Anthropic\'s "Computer Use" API: Security Nightmare or Workflow Holy Grail?',
    category: 'OPINION',
    author: 'Sarah Chen',
    timestamp: '2023.10.23 // 16:00Z',
    readTime: '06 MIN'
  },
  {
    id: 'a6',
    title: 'RAG is Dead. Long Live RAG-with-Reasoning.',
    category: 'USE-CASE',
    author: 'Dr. Wei Lin',
    timestamp: '2023.10.21 // 08:30Z',
    readTime: '09 MIN'
  },
  {
    id: 'a7',
    title: 'Stripe\'s Fraud Detection Migration to specialized SLMs',
    category: 'CASE-STUDY',
    author: 'David Vance',
    timestamp: '2023.10.20 // 13:10Z',
    readTime: '11 MIN'
  }
];

const TICKER_ITEMS = [
  "SYS.UPDATE: GPT-4.5 RUMORED Q1 2024",
  "NVIDIA EARNINGS BEAT EXPECTATIONS BY 14%",
  "EU AI ACT IMPLEMENTATION GUIDELINES RELEASED",
  "YC W24: 70% OF BATCH CLASSIFIED AS 'AI-NATIVE'",
  "DATABRICKS ACQUIRES MOSAICML FOR $1.3B",
  "ANTHROPIC LAUNCHES CLAUDE ENTERPRISE TIER"
];

const getCategoryColorClass = (cat: Category, type: 'text' | 'bg' = 'text') => {
  const base = type === 'text' ? 'sg-category' : 'sg-bg';
  switch (cat) {
    case 'USE-CASE': return `${base}-usecase`;
    case 'NEWS': return `${base}-news`;
    case 'OPINION': return `${base}-opinion`;
    case 'CASE-STUDY': return `${base}-study`;
    default: return 'text-white';
  }
};

export function SignalGrid() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toISOString().replace('T', ' // ').substring(0, 22) + 'Z');
    };
    updateTime();
    const int = setInterval(updateTime, 1000);
    return () => clearInterval(int);
  }, []);

  const heroArticle = ARTICLES.find(a => a.isHero)!;
  const standardArticles = ARTICLES.filter(a => !a.isHero);

  return (
    <div className="sg-theme min-h-screen flex flex-col p-2 md:p-4 lg:p-6 select-none cursor-default">
      {/* Top Header System Bar */}
      <header className="flex justify-between items-center pb-2 sg-mono text-[10px] sm:text-xs text-[var(--sg-text-muted)] tracking-widest uppercase mb-4 border-b border-[var(--sg-border)]">
        <div className="flex gap-4 items-center">
          <span className="text-[var(--sg-text)] font-bold">SIGNAL_AI // v2.0.4</span>
          <span className="hidden sm:inline">SYS.OP: NORMAL</span>
        </div>
        <div>
          <span>{time}</span>
          <span className="sg-cursor"></span>
        </div>
      </header>

      {/* Main Branding Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-baseline gap-4 sg-animate-item">
        <div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-none mb-2">SIGNAL<span className="text-[var(--sg-text-muted)]">.</span>AI</h1>
          <p className="sg-mono text-sm tracking-wide text-[var(--sg-text-muted)] uppercase">
            [ Separating the signal from the AI noise ]
          </p>
        </div>
        
        <nav className="flex gap-4 sm:gap-6 sg-mono text-xs sm:text-sm">
          {['LATEST', 'USE-CASES', 'CASE-STUDIES', 'OPINION', 'ARCHIVE'].map((item, i) => (
            <a key={item} href="#" className="text-[var(--sg-text-muted)] hover:text-white transition-colors uppercase tracking-widest relative group">
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all group-hover:w-full"></span>
            </a>
          ))}
        </nav>
      </div>

      {/* Ticker */}
      <div className="mb-6 border-y border-[var(--sg-border)] py-1.5 sg-mono text-[10px] text-[var(--sg-accent-usecase)] tracking-widest sg-animate-item">
        <div className="sg-ticker-container">
          <div className="sg-ticker-content">
            {/* Double for seamless loop */}
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={i} className="mx-8 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--sg-accent-usecase)] mr-2 opacity-50"></span>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* The Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 sg-grid-wrapper mb-6 flex-grow">
        
        {/* Hero Section (Left Col) */}
        <a href="#" className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-end min-h-[500px] relative overflow-hidden group sg-hover-panel sg-animate-item">
          {heroArticle.image && (
            <div className="absolute inset-0 z-0">
              <img src={heroArticle.image} alt="Hero" className="w-full h-full object-cover sg-image-filter opacity-40 mix-blend-screen" />
              {/* Scanline overlay */}
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.25) 50%)', backgroundSize: '100% 4px' }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--sg-panel)] via-transparent to-transparent z-10"></div>
            </div>
          )}
          
          <div className="relative z-20 mt-auto border-l-2 border-[var(--sg-accent-opinion)] pl-6">
            <div className="flex flex-wrap gap-4 mb-4 sg-mono text-xs uppercase tracking-widest">
              <span className={`font-bold ${getCategoryColorClass(heroArticle.category)}`}>
                [{heroArticle.category}]
              </span>
              <span className="text-[var(--sg-text-muted)]">{heroArticle.timestamp}</span>
              <span className="text-[var(--sg-text-muted)]">READ: {heroArticle.readTime}</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-4 tracking-tight group-hover:text-[var(--sg-accent-opinion)] transition-colors">
              {heroArticle.title}
            </h2>
            
            <p className="text-lg md:text-xl text-[var(--sg-text-muted)] max-w-2xl leading-relaxed">
              {heroArticle.excerpt}
            </p>
            
            <div className="mt-6 sg-mono text-sm flex items-center gap-3 text-[var(--sg-text)]">
              <div className="w-4 h-[1px] bg-white"></div>
              BY {heroArticle.author.toUpperCase()}
            </div>
          </div>
        </a>

        {/* Secondary Section (Right Col) */}
        <div className="lg:col-span-4 flex flex-col sg-grid-wrapper !gap-0 !p-0">
          
          {/* Article 2 */}
          <a href="#" className="flex-1 p-6 relative group sg-hover-panel flex flex-col sg-animate-item border-b border-[var(--sg-border)]">
             <div className="flex flex-wrap justify-between gap-2 mb-4 sg-mono text-[10px] uppercase tracking-widest">
                <span className={`font-bold ${getCategoryColorClass(standardArticles[0].category)}`}>
                  [{standardArticles[0].category}]
                </span>
                <span className="text-[var(--sg-text-muted)]">{standardArticles[0].readTime}</span>
             </div>
             
             <h3 className="text-2xl font-bold leading-tight mb-3 group-hover:text-white transition-colors text-[var(--sg-text)]">
               {standardArticles[0].title}
             </h3>
             
             {standardArticles[0].excerpt && (
               <p className="text-sm text-[var(--sg-text-muted)] mb-4 line-clamp-3">
                 {standardArticles[0].excerpt}
               </p>
             )}
             
             <div className="mt-auto sg-mono text-[10px] text-[var(--sg-text-muted)] pt-4 border-t border-[var(--sg-border-hover)]">
               AUTHOR: {standardArticles[0].author.toUpperCase()} // {standardArticles[0].timestamp.split(' // ')[0]}
             </div>
          </a>

          {/* Article 3 - Image Heavy */}
          <a href="#" className="flex-1 p-6 relative group sg-hover-panel flex flex-col min-h-[250px] overflow-hidden sg-animate-item">
             {standardArticles[2].image && (
                <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-30 transition-opacity">
                  <img src={standardArticles[2].image} alt="Vis" className="w-full h-full object-cover sg-image-filter" />
                </div>
             )}
             <div className="relative z-10 flex flex-col h-full">
               <div className="flex flex-wrap justify-between gap-2 mb-4 sg-mono text-[10px] uppercase tracking-widest">
                  <span className={`font-bold ${getCategoryColorClass(standardArticles[2].category)}`}>
                    [{standardArticles[2].category}]
                  </span>
                  <span className="text-[var(--sg-text-muted)]">{standardArticles[2].readTime}</span>
               </div>
               
               <h3 className="text-2xl font-bold leading-tight mb-3 group-hover:text-white transition-colors text-[var(--sg-text)] mt-auto">
                 {standardArticles[2].title}
               </h3>
               
               <div className="sg-mono text-[10px] text-[var(--sg-text-muted)] pt-4">
                 AUTHOR: {standardArticles[2].author.toUpperCase()} // {standardArticles[2].timestamp.split(' // ')[0]}
               </div>
             </div>
          </a>

        </div>
      </main>

      {/* Bottom Row - 4 Cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 sg-grid-wrapper mb-6">
        {standardArticles.slice(3).map((article, i) => (
          <a key={article.id} href="#" className="p-5 flex flex-col sg-hover-panel group sg-animate-item min-h-[180px]">
             <div className="flex justify-between items-center mb-3">
                <span className={`sg-mono text-[10px] font-bold uppercase tracking-widest ${getCategoryColorClass(article.category)}`}>
                  [{article.category}]
                </span>
                <span className="w-2 h-2 rounded-full border border-[var(--sg-border-hover)] group-hover:border-white transition-colors"></span>
             </div>
             
             <h4 className="text-lg font-bold leading-snug mb-4 group-hover:text-white transition-colors text-[var(--sg-text)] line-clamp-3">
               {article.title}
             </h4>
             
             <div className="mt-auto sg-mono text-[10px] text-[var(--sg-text-muted)] flex justify-between items-center">
               <span>{article.author.toUpperCase()}</span>
               <span>{article.readTime}</span>
             </div>
          </a>
        ))}
      </div>
      
      {/* Footer */}
      <footer className="border-t border-[var(--sg-border)] pt-4 pb-8 flex flex-col md:flex-row justify-between items-center sg-mono text-[10px] text-[var(--sg-text-muted)] uppercase tracking-widest gap-4">
        <div>
          &copy; {new Date().getFullYear()} SIGNAL.AI // NOISE REDUCTION PROTOCOL ACTIVE
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">TWITTER_X</a>
          <a href="#" className="hover:text-white transition-colors">LINKEDIN</a>
          <a href="#" className="hover:text-white transition-colors">RSS_FEED</a>
          <a href="#" className="hover:text-[var(--sg-text)] transition-colors">MANIFESTO</a>
        </div>
      </footer>

    </div>
  );
}
