'use client';

import Link from 'next/link';
import Header from '../Header';
import Reveal from '../Reveal';

export default function ProductsPage() {
  const products = [
    {
      id: '2d-line-diagram',
      title: '2D Line Diagram',
      description: 'Generate dimension‑perfect, Vastu‑compliant 2D blueprints in seconds. Customise rooms, plot size, and orientation.',
      status: 'live',
      icon: '📐',
    },
    {
      id: '3d-elevation',
      title: '3D Elevation',
      description: 'Soon: Interactive 3D walkthroughs of your floor plan – see every room and elevation in realistic detail.',
      status: 'soon',
      icon: '🏗️',
    },
    {
      id: 'interior-design',
      title: 'Interior Design',
      description: 'Soon: AI‑powered interior layouts with furniture placement, colour palettes, and material suggestions.',
      status: 'soon',
      icon: '🛋️',
    },
    {
      id: 'bim-structural',
      title: 'BIM / Structural Drawings',
      description: 'Soon: Professional BIM models and structural engineering drawings for permit and construction.',
      status: 'soon',
      icon: '📊',
    },
    {
      id: 'mep-drawings',
      title: 'MEP Drawings',
      description: 'Soon: Mechanical, Electrical, and Plumbing (MEP) drawings coordinated with your architectural plan.',
      status: 'soon',
      icon: '⚡',
    },
    {
      id: 'hvac',
      title: 'HVAC',
      description: 'Soon: Heating, ventilation, and air conditioning layouts integrated with your building design.',
      status: 'soon',
      icon: '🌬️',
    },
  ];

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden bg-grid" style={{ color: 'var(--text)', background: 'var(--bg)' }}>
      <Header />

      {/* ===== HERO ===== */}
      <section className="max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-12 relative z-10 text-center">
        <Reveal>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Design with <span className="text-accent">Wisdom</span>, <br />
            Build with <span className="text-accent">Confidence</span>
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mt-6 font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            From concept to construction – explore our <span className="text-accent">suite of design tools</span>, with more features coming soon.
          </p>
        </Reveal>
      </section>

      {/* ===== PRODUCTS GRID ===== */}
      <section className="max-w-6xl mx-auto px-6 py-16 relative z-10">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={i * 100}>
              <div
                className={`p-8 rounded-3xl glass-card h-full flex flex-col transition-all hover:-translate-y-1 ${
                  product.status === 'soon' ? 'border border-dashed' : ''
                }`}
                style={{ borderColor: product.status === 'soon' ? 'var(--border-strong)' : 'transparent' }}
              >
                <div className="text-4xl mb-4">{product.icon}</div>
                <h3 className="font-display font-semibold text-xl mb-2">{product.title}</h3>
                <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>
                  {product.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      product.status === 'live'
                        ? 'bg-green-500/20 text-green-600'
                        : 'bg-amber-500/20 text-amber-600'
                    }`}
                  >
                    {product.status === 'live' ? '● Live' : '○ Coming Soon'}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <Footer />
    </div>
  );
}

// ===== FOOTER (reused) =====
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