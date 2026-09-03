'use client';

import { useEffect } from 'react';
import { SessionProvider, signOut } from 'next-auth/react';

const TAB_MARKER = 'sf_tab_session_active';

/**
 * NextAuth's session cookie is persistent (has an explicit expiry), so it
 * survives closing the browser entirely. sessionStorage, unlike cookies,
 * is genuinely cleared when a tab/browser is fully closed — so we use its
 * absence as a signal that this is a fresh browser session, and sign out
 * any stale login cookie left over from before.
 *
 * Trade-off (accepted): sessionStorage is per-tab, so opening the app in
 * a second tab while already signed in will also trigger a sign-out here,
 * which then invalidates the session in the first tab too. This approach
 * is intentionally single-tab-oriented.
 */
function SignOutOnFreshTab() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!window.sessionStorage.getItem(TAB_MARKER)) {
        window.sessionStorage.setItem(TAB_MARKER, '1');
        signOut({ redirect: false }).catch(() => {});
      }
    } catch {
      // sessionStorage unavailable (e.g. privacy mode) — skip silently.
    }
  }, []);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SignOutOnFreshTab />
      {children}
    </SessionProvider>
  );
}