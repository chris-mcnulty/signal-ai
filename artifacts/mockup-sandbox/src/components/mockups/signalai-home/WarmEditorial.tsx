import React, { useEffect, useState } from 'react';
import { ArrowRight, Menu, Search } from 'lucide-react';
import './_warm-editorial.css';

export function WarmEditorial() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="warm-editorial-theme w-full selection:bg-[#B54A32] selection:text-white pb-24">
      {/* Navbar */}
      <header className="border-b border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button className="text-[var(--text-primary)] hover:text-accent transition-colors">
              <Menu size={24} strokeWidth={1.5} />
            </button>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium tracking-wide">
              <a href="#" className="hover:text-accent transition-colors">Use Cases</a>
              <a href="#" className="hover:text-accent transition-colors">Case Studies</a>
              <a href="#" className="hover:text-accent transition-colors">Opinion</a>
              <a href="#" className="hover:text-accent transition-colors">News</a>
            </nav>
          </div>
          
          <div className="text-center">
            <h1 className="font-serif text-3xl font-bold tracking-tight">SignalAI</h1>
            <p className="text-xs tracking-widest uppercase mt-1 text-[var(--text-secondary)]">Separating the signal from the AI noise</p>
          </div>

          <div className="flex items-center gap-6">
            <button className="text-[var(--text-primary)] hover:text-accent transition-colors hidden sm:block">
              <Search size={20} strokeWidth={1.5} />
            </button>
            <button className="bg-[var(--text-primary)] text-white px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </header>

      <main className={`transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-12 md:py-20 animate-fade-in delay-100">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-accent text-xs font-bold tracking-widest uppercase">Case Study</span>
                <span className="text-[var(--text-secondary)] text-sm">— 8 min read</span>
              </div>
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                The Quiet Revolution in Global Logistics
              </h2>
              <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-8">
                While the world debated the consciousness of chatbots, Maersk silently deployed autonomous agents to optimize shipping routes, reducing fuel consumption by 14% in a single quarter.
              </p>
              <div className="flex items-center justify-between border-t border-subtle pt-6">
                <div>
                  <p className="font-medium">By Sarah Chen</p>
                  <p className="text-sm text-[var(--text-secondary)]">October 24, 2023</p>
                </div>
                <button className="w-10 h-10 rounded-full border border-subtle flex items-center justify-center hover:border-accent hover:text-accent transition-colors group">
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
            <div className="lg:col-span-7 order-1 lg:order-2">
              <div className="relative aspect-[16/10] overflow-hidden group">
                <img 
                  src="/__mockup/images/warm-hero.png" 
                  alt="Architectural space" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Latest Stories */}
        <section className="max-w-7xl mx-auto px-6 py-16 animate-fade-in delay-200">
          <div className="flex items-center justify-between mb-12 border-b border-subtle pb-4">
            <h3 className="font-serif text-2xl font-bold">Latest Stories</h3>
            <a href="#" className="text-sm font-medium hover:text-accent transition-colors flex items-center gap-1">
              View all <ArrowRight size={14} />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Article 1 */}
            <article className="group cursor-pointer">
              <div className="aspect-[4/3] overflow-hidden mb-5">
                <img 
                  src="/__mockup/images/warm-article-1.png" 
                  alt="Abstract data" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-accent text-xs font-bold tracking-widest uppercase">Analysis</span>
              </div>
              <h4 className="font-serif text-xl font-bold mb-3 leading-snug group-hover:text-accent transition-colors">
                The True Cost of Running Open Source Models in Production
              </h4>
              <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">
                Beyond the zero-dollar licensing fee, enterprise deployments of Llama 3 reveal hidden infrastructure costs that challenge the prevailing narrative.
              </p>
              <div className="text-xs text-[var(--text-secondary)]">
                By David Thompson • 5 min read
              </div>
            </article>

            {/* Article 2 */}
            <article className="group cursor-pointer">
              <div className="aspect-[4/3] overflow-hidden mb-5">
                <img 
                  src="/__mockup/images/warm-article-2.png" 
                  alt="Warehouse interior" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-accent text-xs font-bold tracking-widest uppercase">Use Cases</span>
              </div>
              <h4 className="font-serif text-xl font-bold mb-3 leading-snug group-hover:text-accent transition-colors">
                How Mid-Market Manufacturers are Actually Using Computer Vision
              </h4>
              <p className="text-[var(--text-secondary)] text-sm mb-4 line-clamp-2">
                Forget fully automated factories. The real ROI is coming from augmented quality assurance on existing assembly lines.
              </p>
              <div className="text-xs text-[var(--text-secondary)]">
                By Elena Rodriguez • 6 min read
              </div>
            </article>

            {/* Article 3 */}
            <article className="group cursor-pointer flex flex-col justify-between p-8 bg-[#EBE5D9]">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-accent text-xs font-bold tracking-widest uppercase">Opinion</span>
                </div>
                <h4 className="font-serif text-2xl font-bold mb-4 leading-snug group-hover:text-accent transition-colors">
                  We Have Reached Peak 'Agent' Hype
                </h4>
                <p className="text-[var(--text-secondary)] mb-6">
                  The term has been stretched so thin it has lost all meaning. It's time to return to describing what software actually does.
                </p>
              </div>
              <div className="text-sm font-medium">
                By Michael Chang
              </div>
            </article>
          </div>
        </section>

        {/* Featured Interview */}
        <section className="bg-[#2C2825] text-white py-20 mt-12 animate-fade-in delay-300">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <img 
                  src="/__mockup/images/warm-article-3.png" 
                  alt="Abstract network" 
                  className="w-full aspect-[4/3] object-cover opacity-90"
                />
              </div>
              <div>
                <span className="text-[#D35236] text-xs font-bold tracking-widest uppercase mb-4 block">The Interview</span>
                <h2 className="font-serif text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  "The moat isn't the model. The moat is the workflow."
                </h2>
                <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                  We sat down with Anthropic's Head of Enterprise to discuss why most companies are approaching AI integration entirely wrong, and what the successful 1% are doing differently.
                </p>
                <button className="border border-white/30 px-6 py-3 text-sm font-medium hover:bg-white hover:text-[#2C2825] transition-colors">
                  Read the Full Interview
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
