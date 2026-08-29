'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative w-[52px] h-8 rounded-full border transition-colors duration-300 flex items-center px-1 shrink-0 ${className}`}
      style={{
        background: 'var(--surface-2)',
        borderColor: 'var(--border-strong)',
      }}
    >
      <span
        className="absolute top-[3px] w-[26px] h-[26px] rounded-full flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] shadow-md"
        style={{
          left: isDark ? '3px' : 'calc(100% - 29px)',
          background: isDark ? '#1e293b' : '#fef3c7',
        }}
      >
        {isDark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#93a1b7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#93a1b7" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9722e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" fill="#c9722e" stroke="none" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )}
      </span>
    </button>
  );
}
