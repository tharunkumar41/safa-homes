'use client';

import Link from 'next/link';
import Header from '../Header';
import Reveal from '../Reveal';

export default function AboutPage() {
  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden bg-grid" style={{ color: 'var(--text)', background: 'var(--bg)' }}>
      <Header />

      {/* ===== HERO ===== */}
      <section className="max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-12 relative z-10 text-center">
        <Reveal>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto">
            <span className="text-accent">AI‑Powered</span> Vastu Design, <br />
            <span className="text-accent">Minimal Input</span>
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mt-6 font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            <span className="text-accent">SafaHomes</span> is a modern AI‑powered web app that helps architects and homeowners generate complete building designs
            with just a few site details – facing, number of bedrooms, and floors. Your one‑stop solution for architectural tools.
          </p>
        </Reveal>
      </section>

      {/* ===== VALUES / FEATURES CARDS ===== */}
      <section className="max-w-6xl mx-auto px-6 py-16 relative z-10">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              emoji: '🧠',
              title: 'AI‑Driven Generation',
              desc: 'Simply enter site facing, bedrooms, and floors – our engine produces a complete, Vastu‑compliant blueprint in seconds.',
            },
            {
              emoji: '📐',
              title: 'Complete Architectural Toolkit',
              desc: 'From 2D layouts to structural, MEP, and HVAC – all your design needs in one platform, with more tools coming.',
            },
            {
              emoji: '⚡',
              title: 'Seamless Client Management',
              desc: 'Reduce time, improve collaboration, and manage clients effortlessly with our integrated workflow.',
            },
          ].map((item, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="p-8 rounded-3xl glass-card h-full flex flex-col transition-all hover:-translate-y-1">
                <div className="text-4xl mb-4">{item.emoji}</div>
                <h3 className="font-display font-semibold text-xl mb-2">
                  {i === 0 && <span className="text-accent">AI‑Driven</span>}
                  {i === 1 && <span className="text-accent">Complete</span>}
                  {i === 2 && <span className="text-accent">Seamless</span>}
                  {i === 0 ? ' Generation' : i === 1 ? ' Architectural Toolkit' : ' Client Management'}
                </h3>
                <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>
                  {item.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== VISION & MISSION ===== */}
      <section className="max-w-5xl mx-auto px-6 py-16 relative z-10">
        <div className="p-10 rounded-3xl glass-panel">
          <h2 className="text-3xl font-display font-bold mb-4">Our Vision &amp; Mission</h2>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Our aim is to use modern technologies in the <span className="text-accent">AECO</span> (Architecture, Engineering, Construction, and Operations)
            industry to reduce design time and manage clients seamlessly.
          </p>
          <p className="text-base leading-relaxed mt-4" style={{ color: 'var(--text-muted)' }}>
            We believe that by combining <span className="text-accent">AI</span> with traditional architectural knowledge, we can empower architects and
            engineers to deliver better projects faster, with fewer errors and greater client satisfaction.
          </p>
          <p className="text-base leading-relaxed mt-4" style={{ color: 'var(--text-muted)' }}>
            <span className="text-accent">SafaHomes</span> is built to be the platform where architects can go from concept to construction documents
            in a fraction of the time – all while maintaining design integrity and Vastu compliance.
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <Footer />
    </div>
  );
}

// ===== FOOTER (reused from landing page) =====
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