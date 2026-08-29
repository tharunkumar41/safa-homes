// Anonymous "try before you sign up" credit tracking.
//
// Signed-out visitors get a small pool of free credits (stored in
// localStorage, per-browser) so they can generate a couple of designs
// before being asked to create an account. Signed-in users are never
// gated by this — it only applies while `useSession()` has no session.

const STORAGE_KEY = "safahomes_guest_credits";

export const INITIAL_CREDITS = 20;
export const CREDITS_PER_GENERATION = 10;

function readStoredCredits(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Current guest credit balance. Initializes (and persists) a fresh
 * balance of INITIAL_CREDITS the first time it's called in a browser
 * that has never used the generator before.
 */
export function getCredits(): number {
  const stored = readStoredCredits();
  if (stored !== null) return stored;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(INITIAL_CREDITS));
  }
  return INITIAL_CREDITS;
}

export function hasEnoughCredits(): boolean {
  return getCredits() >= CREDITS_PER_GENERATION;
}

/**
 * Deduct CREDITS_PER_GENERATION (or a custom amount) and persist the
 * new balance. Returns the balance after deduction, clamped at 0.
 */
export function deductCredits(amount: number = CREDITS_PER_GENERATION): number {
  const remaining = Math.max(0, getCredits() - amount);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, String(remaining));
  }
  return remaining;
}