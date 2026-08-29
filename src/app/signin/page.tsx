'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Header from '../Header';
import Reveal from '../Reveal';

export default function SignInPage() {
  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden bg-grid" style={{ color: 'var(--text)', background: 'var(--bg)' }}>
      <Header />

      {/* ===== HERO ===== */}
      <section className="max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-12 relative z-10 text-center">
        <Reveal>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Welcome <span className="dim-bracket">back</span>
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mt-6 font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Sign in with Google to access your saved projects and continue designing your <span className="text-accent">Vastu‑perfect</span> home.
          </p>
        </Reveal>
      </section>

      {/* ===== SIGN IN ===== */}
      <section className="max-w-lg mx-auto px-6 py-8 relative z-10">
        <div className="p-8 md:p-10 rounded-3xl glass-panel space-y-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 text-sm font-semibold px-6 py-3.5 rounded-full border transition hover:bg-white/30"
            style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
            </svg>
            Continue with Google
          </button>

          <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            New here? Signing in with Google will create your account automatically.
          </p>
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