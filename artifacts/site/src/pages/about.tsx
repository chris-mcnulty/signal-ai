import React from 'react';
import { Link } from 'wouter';
import { Layout, Header, Footer } from '@/components/layout';

export default function AboutPage() {
  return (
    <Layout>
      <Header />

      <main className="max-w-[900px] mx-auto p-6 md:p-12 min-h-[60vh]">
        <div className="mb-12 border-b-4 border-news pb-8 animate-fade-in-up">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-accent mb-4">
            About SignalAI
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-[1.05] mb-6">
            Separating Signal<br className="hidden md:block" /> from Noise
          </h1>
          <p className="text-xl md:text-2xl text-news-secondary font-serif leading-relaxed max-w-3xl">
            Forward-looking, free coverage of commercial AI — for the people building, deploying, and living with it.
          </p>
        </div>

        <div className="space-y-12 animate-fade-in-up">
          <section>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 border-b border-news pb-3">
              Our Mission
            </h2>
            <div className="font-serif text-lg leading-relaxed space-y-4 text-news-primary">
              <p>
                Artificial intelligence is moving faster than the press can cover it. Breathless announcements
                crowd out real analysis. Vendor marketing drowns out practitioner experience. Hype cycles lap the
                truth before most readers have a chance to catch up.
              </p>
              <p>
                SignalAI exists to change that. We publish forward-looking, independently produced coverage of
                commercial AI — the deployments that are working, the ones that aren't, and the forces shaping
                what comes next.
              </p>
              <p>
                We believe the most important AI stories aren't on the research preprint servers. They're in
                enterprise boardrooms, factory floors, hospital corridors, and financial trading desks. We find
                them, verify them, and report them without a paywall.
              </p>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 border-b border-news pb-3">
              What We Cover
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-news">
              {[
                { label: 'Enterprise Deployment', desc: 'How Fortune 500 companies are adopting, scaling, and struggling with AI in production environments.' },
                { label: 'Industry Analysis', desc: 'Sector-by-sector breakdowns of AI adoption curves, ROI realities, and competitive dynamics.' },
                { label: 'Case Studies', desc: 'In-depth, data-driven examinations of real-world AI projects — what worked, what failed, and why.' },
                { label: 'Policy & Regulation', desc: 'The legal and regulatory landscape shaping how commercial AI can be built and deployed.' },
              ].map((item, i) => (
                <div key={i} className={`p-6 ${i % 2 === 0 ? 'border-r border-news' : ''} ${i < 2 ? 'border-b border-news' : ''}`}>
                  <div className="font-mono text-xs font-bold uppercase tracking-widest text-accent mb-2">{item.label}</div>
                  <p className="font-serif text-news-secondary leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4 border-b border-news pb-3">
              Always Free
            </h2>
            <div className="font-serif text-lg leading-relaxed space-y-4 text-news-primary">
              <p>
                Great journalism about AI should not be locked behind a paywall. The people who most need an
                accurate picture of this technology — policymakers, practitioners, small business owners,
                curious citizens — can't always pay for it.
              </p>
              <p>
                SignalAI is and will remain free to read. Our coverage is editorially independent and
                commercially supported. We do not accept paid placements or sponsored content that is presented
                as editorial.
              </p>
            </div>
          </section>

          <section className="border-t-4 border-news pt-8">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <Link
                href="/case-studies"
                className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-widest bg-[#1a1a1a] text-white px-5 py-2.5 hover:bg-accent transition-colors duration-200"
                data-testid="link-about-case-studies"
              >
                Read Case Studies &rarr;
              </Link>
              <Link
                href="/news"
                className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-widest border border-news text-news-primary px-5 py-2.5 hover:border-[#1a1a1a] transition-colors duration-200"
                data-testid="link-about-news"
              >
                Latest News &rarr;
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </Layout>
  );
}
