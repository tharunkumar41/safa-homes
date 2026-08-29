import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

// Server-side enforcement for anonymous "try before you sign up" credits.
// The browser only ever sees an opaque id in an httpOnly cookie — the
// actual balance lives in the GuestCredit table and can't be edited
// from devtools or reset by clearing localStorage.

export const INITIAL_CREDITS = 20;
export const CREDITS_PER_GENERATION = 10;

const COOKIE_NAME = "sh_gid";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

async function getOrCreateGuestId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;

  const id = randomUUID();
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return id;
}

/**
 * Atomically checks and deducts guest credits for a generation.
 * Returns { ok: true, remaining } on success, or { ok: false, remaining }
 * if the guest doesn't have enough credits left.
 *
 * Call this ONLY for unauthenticated requests — signed-in users are
 * never credit-gated.
 */
export async function consumeGuestCredits(
  amount: number = CREDITS_PER_GENERATION
): Promise<{ ok: boolean; remaining: number }> {
  const id = await getOrCreateGuestId();

  // Ensure a row exists (no-op if it already does).
  await prisma.guestCredit.upsert({
    where: { id },
    create: { id, credits: INITIAL_CREDITS },
    update: {},
  });

  // Atomic conditional decrement: only succeeds if the current balance
  // in the DB is still >= amount at the moment of the update, so two
  // concurrent requests can't both spend the last credits.
  const result = await prisma.guestCredit.updateMany({
    where: { id, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });

  const row = await prisma.guestCredit.findUnique({ where: { id } });
  const remaining = row?.credits ?? 0;

  return { ok: result.count > 0, remaining };
}

export async function getGuestCreditBalance(): Promise<number> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (!id) return INITIAL_CREDITS;

  const row = await prisma.guestCredit.findUnique({ where: { id } });
  return row?.credits ?? INITIAL_CREDITS;
}