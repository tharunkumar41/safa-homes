'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
// import ThemeToggle from './ThemeToggle'; // commented out

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.05)' }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo + Back button */}
        <div className="flex items-center gap-3">
          {pathname !== '/' && (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              title="Go back"
              className="flex items-center justify-center w-9 h-9 rounded-full transition hover:bg-white/10 cursor-pointer"
              style={{ color: 'var(--text)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <Link href="/" className="font-display font-bold text-xl flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
            SafaHomes
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          <Link href="/about" className="hover:opacity-70 transition">About</Link>
          <Link href="/products" className="hover:opacity-70 transition">Products</Link>
          <Link href="/blog" className="hover:opacity-70 transition">Blog</Link>
          <Link href="/enquiry" className="hover:opacity-70 transition">Enquiry</Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {session ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-full transition hover:bg-white/10"
                style={{ color: 'var(--text)' }}
              >
                {session.user?.name || session.user?.email}
                <svg
                  className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-1 glass-panel z-50"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm hover:bg-white/10 transition"
                    style={{ color: 'var(--text)' }}
                    onClick={() => setDropdownOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <hr className="my-1" style={{ borderColor: 'var(--border)' }} />
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut({ callbackUrl: '/' });
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/signin"
                className="hidden sm:inline text-sm font-medium hover:opacity-70 transition"
                style={{ color: 'var(--text-muted)' }}
              >
                Sign in
              </Link>
              <Link
                href="/generator"
                className="text-white text-xs sm:text-sm font-bold px-3 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-lg transition-all hover:opacity-90 whitespace-nowrap"
                style={{ background: 'var(--accent)' }}
              >
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Get started for free</span>
              </Link>
            </>
          )}

          {/* ThemeToggle commented out */}
          {/* <ThemeToggle /> */}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="md:hidden px-6 py-4 border-t" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <nav className="flex flex-col gap-4 text-sm font-medium" style={{ color: 'var(--text)' }}>
            <Link href="/about" onClick={() => setMobileMenu(false)}>About</Link>
            <Link href="/products" onClick={() => setMobileMenu(false)}>Products</Link>
            <Link href="/blog" onClick={() => setMobileMenu(false)}>Blog</Link>
            <Link href="/enquiry" onClick={() => setMobileMenu(false)}>Enquiry</Link>
            {!session && (
              <Link href="/signin" onClick={() => setMobileMenu(false)}>Sign in</Link>
            )}
            {session && (
              <>
                <Link href="/dashboard" onClick={() => setMobileMenu(false)}>Dashboard</Link>
                <button
                  onClick={() => {
                    setMobileMenu(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className="text-left hover:opacity-70 transition"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}