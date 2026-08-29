'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import Header from './Header';
import Reveal from './Reveal';

export default function Home() {
  const { data: session } = useSession();
  const isSignedIn = !!session;
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // FAQ data – using JSX for the question so we can have blue highlights
  const faqs = [
    {
      q: (
        <>
          What makes <span className="text-accent">SafaHomes</span>{' '}
          <span className="text-accent">Vastu</span>‑compliant?
        </>
      ),
      a: 'Our AI engine encodes the core principles of Vastu Shastra – cardinal directions, room placements (master bedroom SW, kitchen SE, pooja NE, etc.), and energy flow – into every layout we generate. You simply enter your plot details, and we do the rest.',
    },
    {
      q: (
        <>
          Do I need to know <span className="text-accent">Vastu</span> to use SafaHomes?
        </>
      ),
      a: 'Not at all. SafaHomes is designed for homeowners, builders, and architects alike. The AI handles all the Vastu logic behind the scenes, so you get a harmonious layout without any prior knowledge.',
    },
    {
      q: (
        <>
          Can I customise the <span className="text-accent">Vastu</span> rules?
        </>
      ),
      a: 'Absolutely. You can toggle Vastu compliance on or off, and fine‑tune room placements to suit your preferences. The platform is flexible enough to accommodate both traditional and modern design sensibilities.',
    },
    {
      q: (
        <>
          Is <span className="text-accent">SafaHomes</span> just a floor plan generator?
        </>
      ),
      a: 'It’s a complete design studio. Beyond generating Vastu‑aligned 2D blueprints, you can save projects, export high‑resolution drawings, and soon explore 3D walkthroughs and realistic renders – all in one place.',
    },
    {
      q: (
        <>
          Who is <span className="text-accent">SafaHomes</span> for?
        </>
      ),
      a: 'Homeowners looking to build their dream home, real estate developers, architects, and civil engineers – anyone who values design that respects ancient wisdom while embracing modern technology.',
    },
  ];

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden bg-grid" style={{ color: 'var(--text)', background: 'var(--bg)' }}>
      <Header />

      {/* ===== HERO ===== */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-28 md:pt-40 pb-12 relative z-10 text-center">
        <Reveal>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.1] mx-auto">
            <span className="text-accent">Vastu‑Compliant</span> Home Design, <br />
            <span className="text-accent">Powered by AI</span>
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mt-6 font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Enter your plot dimensions, facing, and room preferences – our AI generates a dimensioned 2D floor plan that honours{' '}
            <span className="text-accent">Vastu principles</span>, instantly.
          </p>
        </Reveal>
        <Reveal delay={240} className="mt-10 flex flex-wrap justify-center gap-4">
          {isSignedIn ? (
            <Link
              href="/dashboard"
              className="btn-primary text-sm px-8 py-3"
            >
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/generator"
                className="btn-primary text-sm px-8 py-3"
              >
                Get started for free
              </Link>
              <Link
                href="/products"
                className="text-sm font-semibold px-6 py-3 rounded-full transition hover:bg-white/50"
                style={{ color: 'var(--text)', background: 'var(--surface)' }}
              >
                Explore features →
              </Link>
            </>
          )}
        </Reveal>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="max-w-6xl mx-auto px-6 pt-56 pb-20 relative z-10">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
            The future of <span className="text-accent">home design</span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-center max-w-2xl mx-auto mb-14 text-base" style={{ color: 'var(--text-muted)' }}>
            From <span className="text-accent">Vastu‑aligned layouts</span> to complete building design – our AI engine adapts to your needs.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: '🧭',
              title: 'Vastu‑Aligned Layouts',
              desc: 'Rooms are automatically placed according to Vastu – master bedroom in SW, kitchen in SE, pooja in NE, and more. You can toggle Vastu on/off anytime.',
            },
            {
              icon: '🛠️',
              title: 'Customise Every Detail',
              desc: 'Adjust bedrooms, bathrooms, parking, garden, and servant quarters. The layout updates instantly, and you can save projects for later.',
            },
            {
              icon: '📤',
              title: 'Export & Collaborate',
              desc: 'Download your floor plan as PNG or SVG. Share with your architect or builder. Soon, explore 3D walkthroughs and photorealistic renders.',
            },
          ].map((feature, i) => (
            <Reveal key={i} delay={i * 120}>
              <div className="p-8 rounded-3xl glass-card h-full flex flex-col transition-all hover:-translate-y-1">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="font-display font-semibold text-xl mb-2">
                  {i === 0 && <span className="text-accent">Vastu‑Aligned</span>}
                  {i === 1 && <span className="text-accent">Customise</span>}
                  {i === 2 && <span className="text-accent">Export</span>}
                  {i === 0 ? ' Layouts' : i === 1 ? ' Every Detail' : ' & Collaborate'}
                </h3>
                <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>
                  {feature.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== STATS – numbers in blue, labels in black ===== */}
      <section className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10 rounded-3xl glass-panel">
          {[
            { value: '1K+', label: 'Floor plans generated' },
            { value: '500+', label: 'Vastu‑compliant designs' },
            { value: '100+', label: 'Happy architects & builders' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-extrabold font-display text-accent">
                {stat.value}
              </div>
              <div className="text-sm mt-2" style={{ color: 'var(--text)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="max-w-4xl mx-auto px-6 py-20 relative z-10">
        <Reveal>
          <h2 className="text-3xl font-display font-bold text-center mb-4">
            <span className="text-accent">Vastu‑Focused</span> FAQ
          </h2>
          <p className="text-center max-w-xl mx-auto mb-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            Quick answers about our platform and how we bring <span className="text-accent">Vastu</span> into modern design.
          </p>
        </Reveal>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl glass-card overflow-hidden transition-all"
              style={{ background: 'var(--surface)' }}
            >
              <button
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-white/5 transition"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <span className="font-medium" style={{ color: 'var(--text)' }}>
                  {faq.q}
                </span>
                <span className="text-xl" style={{ color: 'var(--text-muted)' }}>
                  {openFaq === idx ? '−' : '+'}
                </span>
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <Footer />
    </div>
  );
}

// ===== FOOTER =====
function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-6 py-16 relative z-10">
      <div className="grid md:grid-cols-4 gap-8 border-t pt-10" style={{ borderColor: 'var(--border)' }}>
        <div>
          <Link href="/" className="font-display font-bold text-xl">
            SafaHomes
          </Link>
          <div className="mt-4">
            <Link
              href="/generator"
              className="btn-primary text-sm px-6 py-3"
            >
              Get started for free
            </Link>
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