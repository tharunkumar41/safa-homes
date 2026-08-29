'use client';

import Link from 'next/link';
import Header from '../Header';
import Reveal from '../Reveal';
import EnquiryForm from '../EnquiryForm';

export default function EnquiryPage() {
  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden bg-grid" style={{ color: 'var(--text)', background: 'var(--bg)' }}>
      <Header />

      {/* ===== HERO ===== */}
      <section className="max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-12 relative z-10 text-center">
        <Reveal>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Let’s design your <br />
            <span className="text-accent">Vastu‑perfect</span> space
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mt-6 font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Have questions about your project? Fill in the form below and we’ll get back to you within <span className="text-accent">24 hours</span>.
          </p>
        </Reveal>
      </section>

      {/* ===== ENQUIRY FORM ===== */}
      <section className="max-w-4xl mx-auto px-6 py-12 relative z-10">
        <div className="p-10 md:p-14 rounded-3xl glass-panel relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
          <div className="relative">
            <EnquiryForm />
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <Footer />
    </div>
  );
}

// ===== FOOTER (reused from other pages) =====
function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-6 py-16 relative z-10">
      <div className="grid md:grid-cols-4 gap-8 border-t pt-10" style={{ borderColor: 'var(--border)' }}>
        <div>
          <Link href="/" className="font-display font-bold text-xl">SafaHomes</Link>
          <div className="mt-4">
            <Link href="/generator" className="btn-primary text-sm px-6 py-3">Get started for free</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-4">Product</h4>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <li><Link href="/products">Features</Link></li>
            <li><Link href="/dashboard">My Projects</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-4">Company</h4>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/enquiry">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-4">Social</h4>
          <div className="flex gap-3">
            <a href="#" className="p-2 rounded-full" style={{ background: 'var(--surface)' }}>🐦</a>
            <a href="#" className="p-2 rounded-full" style={{ background: 'var(--surface)' }}>📘</a>
            <a href="#" className="p-2 rounded-full" style={{ background: 'var(--surface)' }}>📸</a>
          </div>
          <div className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            <a href="mailto:info@safahomes.com">info@safahomes.com</a>
          </div>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t text-xs text-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} SafaHomes. All rights reserved.
      </div>
    </footer>
  );
}