import React from 'react';
import { Search, Menu, ChevronRight } from 'lucide-react';
import './_broadsheet.css';

export function Broadsheet() {
  return (
    <div className="broadsheet-theme">
      {/* Header */}
      <header className="border-b-4 border-news py-4 px-6 md:px-12 flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-4 w-1/3">
          <button className="hover-dim text-news-primary"><Menu size={24} /></button>
          <button className="hover-dim text-news-primary"><Search size={24} /></button>
        </div>
        <div className="w-1/3 text-center">
          <h1 className="font-serif text-4xl md:text-6xl font-black tracking-tight text-news-primary">
            Signal<span className="text-accent">AI</span>
          </h1>
          <p className="font-mono text-xs md:text-sm mt-2 text-news-secondary uppercase tracking-widest">
            Separating the signal from the AI noise
          </p>
        </div>
        <div className="w-1/3 flex justify-end">
          <button className="bg-news border border-news text-news-primary px-4 py-2 font-mono text-sm uppercase tracking-wider hover:bg-black hover:text-white transition-colors duration-300">
            Subscribe
          </button>
        </div>
      </header>

      {/* Ticker / Dateline */}
      <div className="border-b border-news py-2 px-6 md:px-12 flex justify-between items-center text-xs font-mono text-news-secondary uppercase tracking-wider animate-fade-in-up delay-100">
        <div>Thursday, October 26, 2023</div>
        <div className="hidden md:flex gap-6">
          <span className="hover-dim cursor-pointer">Use Cases</span>
          <span className="hover-dim cursor-pointer">Industry News</span>
          <span className="hover-dim cursor-pointer">Opinion</span>
          <span className="hover-dim cursor-pointer">Case Studies</span>
        </div>
        <div>Edition No. 142</div>
      </div>

      <main className="max-w-[1600px] mx-auto p-6 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Main Lead Story */}
          <article className="lg:col-span-8 group cursor-pointer animate-fade-in-up delay-200">
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-xs font-bold uppercase text-accent tracking-widest border border-accent px-2 py-1">Case Study</span>
              <span className="font-mono text-xs text-news-secondary uppercase">8 min read</span>
            </div>
            
            <h2 className="font-serif text-5xl md:text-7xl font-bold leading-[1.1] mb-6 group-hover:text-accent transition-colors duration-300">
              The $40M Illusion: Why Enterprise LLM Deployments Are Stalling in Production
            </h2>
            
            <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed mb-8 pr-0 md:pr-12">
              Fortune 500 companies poured billions into generative AI pilots this year. Now, as the bills come due and latency issues mount, the stark reality of productionizing language models is forcing a quiet retreat to traditional machine learning.
            </p>

            <div className="w-full aspect-video bg-gray-200 mb-6 overflow-hidden">
              <img 
                src="/__mockup/images/broadsheet_hero.jpg" 
                alt="Server racks" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </div>

            <div className="flex justify-between items-center border-t border-b border-news py-3 mt-6">
              <div className="font-mono text-sm uppercase">By <span className="font-bold text-news-primary">Elena Rostova</span></div>
              <button className="flex items-center gap-1 font-mono text-sm text-accent uppercase tracking-widest group-hover:gap-2 transition-all">
                Read Article <ChevronRight size={16} />
              </button>
            </div>
          </article>

          {/* Right Sidebar Stories */}
          <aside className="lg:col-span-4 flex flex-col gap-8 animate-fade-in-up delay-300">
            <div className="border-t-4 border-news pt-2 mb-4">
              <h3 className="font-mono text-sm font-bold uppercase tracking-widest">Latest Analysis</h3>
            </div>

            <article className="group cursor-pointer">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-accent font-bold text-xs uppercase tracking-wider">Use Case</span>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <h4 className="font-serif text-2xl font-bold leading-tight mb-2 group-hover:text-accent transition-colors">
                    Autonomous Agents Reshape Global Freight Routing
                  </h4>
                  <p className="text-sm text-news-secondary mb-3 line-clamp-3">
                    Maersk and Flexport are quietly replacing heuristic algorithms with multi-agent reinforcement learning, cutting idle port times by up to 14%.
                  </p>
                  <div className="font-mono text-xs text-news-secondary uppercase">By Marcus Chen</div>
                </div>
                <div className="w-24 h-24 flex-shrink-0 bg-gray-200 overflow-hidden">
                  <img src="/__mockup/images/broadsheet_logistics.jpg" alt="Logistics" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            </article>

            <hr className="border-news" />

            <article className="group cursor-pointer">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-accent font-bold text-xs uppercase tracking-wider">Opinion</span>
              </div>
              <h4 className="font-serif text-2xl font-bold leading-tight mb-2 group-hover:text-accent transition-colors">
                Stop Building RAG. Start Fixing Your Data Pipelines.
              </h4>
              <p className="text-sm text-news-secondary mb-3">
                The most sophisticated retrieval-augmented generation system cannot save you from fundamentally rotten source documents.
              </p>
              <div className="font-mono text-xs text-news-secondary uppercase">By Sarah Jennings</div>
            </article>

            <hr className="border-news" />

            <article className="group cursor-pointer">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-accent font-bold text-xs uppercase tracking-wider">Economics</span>
              </div>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <h4 className="font-serif text-2xl font-bold leading-tight mb-2 group-hover:text-accent transition-colors">
                    The Hidden Token Economics of Copilot Licenses
                  </h4>
                  <p className="text-sm text-news-secondary mb-3 line-clamp-2">
                    An analysis of per-seat pricing models reveals the true margin profile of enterprise AI assistants.
                  </p>
                  <div className="font-mono text-xs text-news-secondary uppercase">By David Osei</div>
                </div>
                <div className="w-24 h-24 flex-shrink-0 bg-gray-200 overflow-hidden">
                  <img src="/__mockup/images/broadsheet_finance.jpg" alt="Finance chart" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
              </div>
            </article>

          </aside>
        </div>

        {/* Bottom Strip */}
        <section className="mt-16 border-t-2 border-black pt-8 animate-fade-in-up delay-400">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-4 mb-4">
              <h3 className="font-serif text-3xl font-bold">In Brief</h3>
            </div>
            
            {[
              { tag: "News", title: "OpenAI announces new enterprise SLA tier prioritizing compliance over latency." },
              { tag: "Hardware", title: "Nvidia's latest H200 chips show diminishing returns for fine-tuning workloads." },
              { tag: "Regulation", title: "EU AI Act triggers compliance scramble among European fintechs." },
              { tag: "Security", title: "Prompt injection vulnerabilities found in top customer service platforms." }
            ].map((item, i) => (
              <div key={i} className="group cursor-pointer border-l-2 border-news pl-4 hover:border-accent transition-colors">
                <div className="font-mono text-xs font-bold text-news-secondary uppercase mb-2">{item.tag}</div>
                <h4 className="font-serif text-lg leading-tight group-hover:text-accent transition-colors">{item.title}</h4>
              </div>
            ))}
          </div>
        </section>

      </main>
      
      <footer className="bg-black text-white py-12 px-6 md:px-12 mt-12">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center">
          <div>
            <h2 className="font-serif text-3xl font-black tracking-tight mb-2">Signal<span className="text-accent">AI</span></h2>
            <p className="font-mono text-xs text-gray-400 uppercase tracking-widest">© 2023 SignalAI Media</p>
          </div>
          <div className="flex gap-8 font-mono text-sm uppercase tracking-wider mt-8 md:mt-0">
            <span className="hover:text-accent cursor-pointer transition-colors">About</span>
            <span className="hover:text-accent cursor-pointer transition-colors">Manifesto</span>
            <span className="hover:text-accent cursor-pointer transition-colors">Subscribe</span>
            <span className="hover:text-accent cursor-pointer transition-colors">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
