'use client';

import Link from 'next/link';
import Header from '../Header';

export default function ContactPage() {
  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden" style={{ color: 'var(--text)' }}>
      <Header />

      <main className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-12 relative z-10">
        <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-[1.1] max-w-3xl">
          Get in <span className="dim-bracket">Touch</span>
        </h1>
        <p className="text-base md:text-lg max-w-2xl mt-6 font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Have questions about <span className="text-accent">Vastu</span>, our generator, or your project? We’d love to hear from you.
        </p>

        <div className="mt-12 p-8 rounded-3xl glass-panel max-w-2xl">
          <form className="space-y-6">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Your Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rajesh Kumar"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition glass-card"
                style={{ color: 'var(--text)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="rajesh@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition glass-card"
                style={{ color: 'var(--text)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Message
              </label>
              <textarea
                rows={4}
                placeholder="Tell us about your project or query..."
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition glass-card resize-none"
                style={{ color: 'var(--text)' }}
              />
            </div>
            <button
              type="submit"
              className="w-full text-white text-sm font-semibold py-3 rounded-xl transition-all shadow-md glow-button"
              style={{ background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--accent-2)))' }}
              onClick={(e) => e.preventDefault()}
            >
              Send Enquiry (Coming Soon)
            </button>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              We’ll get back to you within 24 hours.
            </p>
          </form>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="flex items-center gap-2 font-display font-semibold" style={{ color: 'var(--text)' }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
          SafaHomes
        </div>
        <div>© {new Date().getFullYear()} SafaHomes Studio. All drawings generated on the fly.</div>
      </footer>
    </div>
  );
}