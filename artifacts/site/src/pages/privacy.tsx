import React from 'react';
import { Link } from 'wouter';
import { Layout, Header, Footer } from '@/components/layout';

const SECTIONS = [
  {
    heading: "Information We Collect",
    body: `We may collect information that you voluntarily provide, including:

Name, email address, company name, job title, and contact information. Event registration details, survey responses, and information submitted through contact forms, newsletter subscriptions, downloads, or correspondence.

We may also collect limited technical information about how visitors use our website, including: IP address, browser type, device information, referring website, pages visited, and general website usage and engagement data.`,
  },
  {
    heading: "How We Use Information",
    body: `We use information to:

Deliver newsletters, reports, podcasts, and editorial content. Notify subscribers about new articles, research, events, and publications. Respond to inquiries and requests. Improve our website, content, and reader experience. Measure audience engagement and website performance. Conduct research and analysis related to our publication. Comply with legal and regulatory requirements.`,
  },
  {
    heading: "Communications",
    body: `When you subscribe to BlueTrail, register for an event, download content, request information, participate in a survey, or otherwise provide contact information, you may receive communications from BlueTrail regarding:

Publications and newsletters. Research reports and analysis. Podcasts, webinars, and events. Educational content and learning opportunities. Community activities and programs. Related products, services, and offerings.

Every marketing email includes an unsubscribe link. You may opt out at any time.`,
  },
  {
    heading: "BlueTrail and Affiliated Organizations",
    body: `BlueTrail Intelligence may operate publications, newsletters, events, research programs, educational offerings, podcasts, communities, and other initiatives under the BlueTrail brand.

Subscriber information may be used by BlueTrail and affiliated organizations under common ownership, management, or operational control for communications related to publications and editorial content, research and industry analysis, educational programs and learning opportunities, events and conferences, podcasts and media productions, and professional and advisory services.

We do not sell, rent, license, or transfer subscriber information to third parties for their marketing purposes.

You may unsubscribe from marketing communications at any time. Unsubscribing from marketing communications will not affect service-related or administrative communications necessary to fulfill a request you have made.`,
  },
  {
    heading: "What We Do Not Do",
    body: `BlueTrail does not:

Sell subscriber information. Rent subscriber lists. Share personal information with data brokers. Transfer subscriber information to third parties for marketing purposes. Present sponsored content as independent editorial coverage.

We believe trust is more valuable than data.`,
  },
  {
    heading: "Cookies and Analytics",
    body: `BlueTrail uses cookies and similar technologies to operate the website, remember preferences, measure website traffic and engagement, improve website performance, and understand how readers interact with our content.

Where required by law, visitors will be given the opportunity to accept or decline non-essential cookies.

Most web browsers allow you to control cookies through browser settings. Disabling cookies may impact the functionality of certain website features.`,
  },
  {
    heading: "Sharing Information",
    body: `We may share information with trusted service providers who help us operate BlueTrail, including providers of: website hosting, email delivery, analytics and measurement, event registration and webinar services, and customer relationship management systems.

These providers may access information only as necessary to perform services on our behalf and are required to maintain appropriate safeguards.`,
  },
  {
    heading: "Data Retention",
    body: `We retain subscriber information for as long as reasonably necessary to provide requested communications, maintain subscription records, support publication activities, comply with legal obligations, and improve our services.

You may request deletion of your personal information at any time.`,
  },
  {
    heading: "Your Choices",
    body: `You may:

Unsubscribe from communications at any time. Request access to information we maintain about you. Request correction of inaccurate information. Request deletion of your personal information, subject to applicable legal requirements.`,
  },
  {
    heading: "Security",
    body: `We employ reasonable administrative, technical, and organizational safeguards designed to protect personal information from unauthorized access, disclosure, alteration, or destruction.

While no system can guarantee absolute security, we take appropriate measures to protect the information entrusted to us.`,
  },
  {
    heading: "Changes to This Privacy Statement",
    body: `We may update this Privacy Statement from time to time.

Updates will be posted on this page together with a revised effective date. Continued use of BlueTrail services after such updates constitutes acceptance of the revised Privacy Statement.`,
  },
  {
    heading: "Contact Us",
    body: `For privacy-related questions or requests, please contact us at privacy@bluetrail.ai.`,
  },
];

export default function PrivacyPage() {
  return (
    <Layout>
      <Header />

      <main className="max-w-[760px] mx-auto px-6 py-16 md:py-24">
        <div className="mb-12 animate-fade-in-up">
          <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-4">
            Legal
          </div>
          <hr className="hero-rule mb-6" />
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-news-primary leading-tight mb-4">
            Privacy Statement
          </h1>
          <p className="font-mono text-xs text-news-secondary uppercase tracking-wider">
            BlueTrail Intelligence · Effective Date: July 19, 2026
          </p>
        </div>

        <div className="prose-news mb-10">
          <p className="text-news-secondary leading-relaxed text-base">
            BlueTrail Intelligence ("BlueTrail," "we," "our," or "us") is committed to protecting your privacy and using your information responsibly. This Privacy Statement explains what information we collect, how we use it, and the choices available to you.
          </p>
        </div>

        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.heading} className="border-t border-news pt-8">
              <h2 className="font-serif text-xl font-bold text-news-primary mb-4">
                {section.heading}
              </h2>
              <div className="space-y-3">
                {section.body.split("\n\n").map((para, i) => (
                  <p key={i} className="text-news-secondary leading-relaxed text-sm">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 p-6 border border-news bg-news-secondary/5">
          <p className="font-serif text-sm text-news-secondary leading-relaxed italic">
            By subscribing to BlueTrail Intelligence or using our website, you acknowledge and consent to the collection and use of information as described in this Privacy Statement.
          </p>
        </div>

        <div className="mt-10 pt-8 border-t border-news">
          <Link href="/" className="font-mono text-xs uppercase tracking-widest text-accent hover:opacity-70 transition-opacity">
            ← Return to bluetrAIl
          </Link>
        </div>
      </main>

      <Footer />
    </Layout>
  );
}
