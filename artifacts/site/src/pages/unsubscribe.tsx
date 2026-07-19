import React, { useEffect, useState } from 'react';
import { Link, useSearch as useWouterSearch } from 'wouter';
import { Layout, Header, Footer } from '@/components/layout';

type Status = 'loading' | 'success' | 'already' | 'error' | 'invalid';

export default function UnsubscribePage() {
  const rawSearch = useWouterSearch();
  const params = new URLSearchParams(rawSearch);
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';

  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!email || !token) {
      setStatus('invalid');
      return;
    }

    const base = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';
    fetch(`${base}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.status === 403) { setStatus('invalid'); return; }
        if (!res.ok) { setStatus('error'); return; }
        const data = await res.json() as { ok: boolean; alreadyUnsubscribed?: boolean };
        setStatus(data.alreadyUnsubscribed ? 'already' : 'success');
      })
      .catch(() => setStatus('error'));
  }, [email, token]);

  const messages: Record<Status, { heading: string; body: string }> = {
    loading: {
      heading: 'Processing…',
      body: 'Please wait while we update your subscription.',
    },
    success: {
      heading: "You've been unsubscribed.",
      body: "We're sorry to see you go. You will no longer receive the bluetrAIl Intelligence Digest. You can resubscribe at any time from the home page.",
    },
    already: {
      heading: 'Already unsubscribed.',
      body: 'This email address is not currently subscribed to our newsletter.',
    },
    invalid: {
      heading: 'Invalid unsubscribe link.',
      body: 'This link is invalid or has expired. If you believe this is an error, please contact us at privacy@bluetrail.ai.',
    },
    error: {
      heading: 'Something went wrong.',
      body: 'We could not process your request right now. Please try again later or contact us at privacy@bluetrail.ai.',
    },
  };

  const { heading, body } = messages[status];

  return (
    <Layout>
      <Header />
      <main className="max-w-[600px] mx-auto px-6 py-24 md:py-36 text-center">
        <div className="animate-fade-in-up">
          <div className="font-mono text-xs uppercase tracking-widest text-news-secondary mb-6">
            Newsletter
          </div>
          <hr className="hero-rule mb-8 w-12 mx-auto" />
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-news-primary mb-6 leading-tight">
            {heading}
          </h1>
          <p className="text-news-secondary leading-relaxed text-base mb-10">
            {body}
          </p>
          {status !== 'loading' && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="font-mono text-xs uppercase tracking-widest border border-news px-5 py-3 hover:bg-news hover:text-news-bg transition-colors duration-200 text-news-primary"
              >
                Return Home
              </Link>
              {(status === 'success' || status === 'already') && (
                <a
                  href="mailto:privacy@bluetrail.ai"
                  className="font-mono text-xs uppercase tracking-widest text-news-secondary hover:text-news-primary transition-colors duration-200 px-5 py-3"
                >
                  Contact Us
                </a>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </Layout>
  );
}
