import React from 'react';
import { Search, Menu, ArrowLeft, Share2, Bookmark, Twitter, Linkedin } from 'lucide-react';
import './_broadsheet.css';

export function ArticlePage() {
  return (
    <div className="broadsheet-theme">
      {/* Header (Slimmer for article) */}
      <header className="border-b border-news py-3 px-6 md:px-12 flex items-center justify-between sticky top-0 bg-news/95 backdrop-blur z-50">
        <div className="flex items-center gap-4 w-1/3">
          <button className="hover-dim text-news-primary flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
            <ArrowLeft size={16} /> Home
          </button>
        </div>
        <div className="w-1/3 text-center">
          <h1 className="font-serif text-2xl font-black tracking-tight text-news-primary cursor-pointer hover:opacity-80">
            Signal<span className="text-accent">AI</span>
          </h1>
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
            <span className="font-mono text-xs font-bold uppercase text-accent tracking-widest border border-accent px-2 py-1">Case Study</span>
            <span className="font-mono text-xs text-news-secondary uppercase">October 26, 2023 • 8 min read</span>
          </div>
          
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
            The $40M Illusion: Why Enterprise LLM Deployments Are Stalling
          </h1>
          
          <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed mb-8">
            Fortune 500 companies poured billions into generative AI pilots this year. Now, as latency issues mount and the bills come due, the stark reality of productionizing language models is forcing a quiet retreat.
          </p>

          <div className="flex items-center justify-between border-t border-b border-news py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden border border-news">
                <img src="https://i.pravatar.cc/150?u=elena" alt="Elena Rostova" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-sans font-bold text-sm">Elena Rostova</div>
                <div className="font-mono text-xs text-news-secondary uppercase tracking-wider">Senior Analyst</div>
              </div>
            </div>
            
            <div className="flex gap-3 text-news-secondary">
              <button className="p-2 border border-transparent hover:border-news rounded-full transition-colors"><Twitter size={18} /></button>
              <button className="p-2 border border-transparent hover:border-news rounded-full transition-colors"><Linkedin size={18} /></button>
              <button className="p-2 border border-transparent hover:border-news rounded-full transition-colors"><Bookmark size={18} /></button>
              <button className="p-2 border border-transparent hover:border-news rounded-full transition-colors"><Share2 size={18} /></button>
            </div>
          </div>
        </header>

        {/* Hero Image */}
        <figure className="w-full mb-12 animate-fade-in-up delay-100">
          <div className="aspect-[16/9] w-full bg-gray-200 overflow-hidden mb-3">
            <img 
              src="/__mockup/images/broadsheet_hero.jpg" 
              alt="Data center racks in dramatic lighting" 
              className="w-full h-full object-cover"
            />
          </div>
          <figcaption className="font-mono text-xs text-news-secondary text-right">
            Photography by A. Mercer / SignalAI
          </figcaption>
        </figure>

        {/* Article Body */}
        <div className="article-body font-sans text-news-primary animate-fade-in-up delay-200">
          <p className="first-letter:font-serif first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-[-0.1em] first-letter:text-accent">
            It started with a proof of concept that wowed the board. A prominent North American logistics firm had trained an LLM agent to read complex customs manifests, cross-reference them against global trade regulations, and flag compliance anomalies. In a sterile sandbox environment, the model exhibited near-human accuracy at machine speed. The CEO declared it a new era.
          </p>
          
          <p>
            Twelve months and forty million dollars later, the project has been quietly shelved. The primary culprits weren't accuracy or reasoning capabilities—the model remained robust on those fronts. The silent killers were unit economics and latency at scale.
          </p>

          <p>
            "People fail to understand that an API call taking two seconds is perfectly fine for a chatbot, but catastrophic when you are processing millions of rows of real-time supply chain telemetry," explains Marcus Thorne, a systems architect who consults for Fortune 500 CIOs. "We are seeing a massive hangover effect. The hype cycle convinced executives that generative AI was a panacea for all data extraction tasks. The reality is that inference is expensive, and scaling it requires infrastructure that most non-tech companies simply do not possess."
          </p>

          <blockquote>
            "The hype cycle convinced executives that generative AI was a panacea. The reality is that inference is expensive, and scaling it requires infrastructure most companies do not possess."
          </blockquote>

          <h2>The RAG Reality Check</h2>
          
          <p>
            Much of the enterprise focus over the past year has been on Retrieval-Augmented Generation (RAG)—a technique designed to ground foundation models in proprietary corporate data. Vendors pitched RAG as the ultimate plug-and-play solution for enterprise knowledge management. 
          </p>

          <p>
            However, early adopters are discovering a painful truth: a RAG system is only as good as the unstructured data feeding it. Decades of neglected taxonomy, redundant SharePoint sites, and contradictory policy documents are being ingested by embedding models, resulting in confident, eloquently phrased hallucinations.
          </p>

          <p>
            To fix this, companies are being forced to undertake massive, labor-intensive data hygiene projects. The irony is palpable; a technology promised to eliminate manual data processing is instead mandating the largest manual data cleanup initiative in corporate history.
          </p>

          <h2>A Pivot to Smaller Models</h2>

          <p>
            The pendulum is beginning to swing back. Rather than routing every request through a massive, general-purpose model like GPT-4, sophisticated engineering teams are embracing SLMs—Small Language Models. These tightly scoped, fine-tuned models can be run locally, offering predictable latency profiles and significantly reduced operational expenditure.
          </p>

          <p>
            The era of the "everything model" in the enterprise may already be peaking. The future belongs to the unglamorous work of orchestration: routing simple tasks to deterministic scripts, classification tasks to cheap SLMs, and saving the heavy, expensive inference only for edge cases that truly require generalized reasoning. The magic trick is over. Now, the real engineering begins.
          </p>
        </div>

        {/* Tags */}
        <div className="mt-12 pt-6 border-t border-news flex flex-wrap gap-2 animate-fade-in-up delay-300">
          <span className="font-mono text-xs uppercase border border-border-color px-3 py-1 hover:bg-news-primary hover:text-white cursor-pointer transition-colors">Enterprise AI</span>
          <span className="font-mono text-xs uppercase border border-border-color px-3 py-1 hover:bg-news-primary hover:text-white cursor-pointer transition-colors">Infrastructure</span>
          <span className="font-mono text-xs uppercase border border-border-color px-3 py-1 hover:bg-news-primary hover:text-white cursor-pointer transition-colors">LLM Operations</span>
          <span className="font-mono text-xs uppercase border border-border-color px-3 py-1 hover:bg-news-primary hover:text-white cursor-pointer transition-colors">Economics</span>
        </div>

      </main>

      {/* Related Reading */}
      <section className="bg-news border-t-4 border-black py-16 px-6 md:px-12">
        <div className="max-w-[1200px] mx-auto">
          <h3 className="font-serif text-3xl font-bold mb-10 text-center">Further Reading</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <article className="group cursor-pointer">
              <div className="w-full aspect-[4/3] bg-gray-200 mb-4 overflow-hidden">
                <img src="/__mockup/images/broadsheet_logistics.jpg" alt="Logistics" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="font-mono text-xs font-bold text-accent uppercase tracking-widest mb-2">Use Case</div>
              <h4 className="font-serif text-xl font-bold leading-tight mb-2 group-hover:text-accent transition-colors">
                Autonomous Agents Reshape Global Freight Routing
              </h4>
              <p className="text-sm text-news-secondary line-clamp-2">Maersk and Flexport are quietly replacing heuristic algorithms with multi-agent reinforcement learning.</p>
            </article>

            <article className="group cursor-pointer">
              <div className="w-full aspect-[4/3] bg-gray-200 mb-4 overflow-hidden border border-news flex items-center justify-center bg-[#f0eee9]">
                 <span className="font-serif text-4xl font-bold text-news-secondary opacity-30">Opinion</span>
              </div>
              <div className="font-mono text-xs font-bold text-accent uppercase tracking-widest mb-2">Opinion</div>
              <h4 className="font-serif text-xl font-bold leading-tight mb-2 group-hover:text-accent transition-colors">
                Stop Building RAG. Start Fixing Your Data Pipelines.
              </h4>
              <p className="text-sm text-news-secondary line-clamp-2">The most sophisticated retrieval-augmented generation system cannot save you from fundamentally rotten source documents.</p>
            </article>

            <article className="group cursor-pointer">
              <div className="w-full aspect-[4/3] bg-gray-200 mb-4 overflow-hidden">
                <img src="/__mockup/images/broadsheet_finance.jpg" alt="Finance" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="font-mono text-xs font-bold text-accent uppercase tracking-widest mb-2">Economics</div>
              <h4 className="font-serif text-xl font-bold leading-tight mb-2 group-hover:text-accent transition-colors">
                The Hidden Token Economics of Copilot Licenses
              </h4>
              <p className="text-sm text-news-secondary line-clamp-2">An analysis of per-seat pricing models reveals the true margin profile of enterprise AI assistants.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-8 px-6 md:px-12 text-center">
        <h2 className="font-serif text-2xl font-black tracking-tight mb-4 opacity-50">SignalAI</h2>
        <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">© 2023 SignalAI Media. All rights reserved.</p>
      </footer>

    </div>
  );
}
