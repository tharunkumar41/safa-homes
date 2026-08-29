import prisma from "@/lib/prisma";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limiting: allows up to `limit` calls per `windowMs`
 * for a given `key` (typically "<route>:<ip>"). When the window has
 * expired, it resets to a fresh window rather than sliding.
 *
 * Not perfectly race-free under very high concurrency (two requests
 * arriving in the same instant could both slip through right at the
 * limit boundary), but that's an acceptable tradeoff here — the goal is
 * blocking casual brute-force/spam, not airtight precision.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date();
  const existing = await prisma.rateLimit.findUnique({ where: { key } });

  const windowExpired =
    !existing || now.getTime() - existing.windowStart.getTime() > windowMs;

  if (windowExpired) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterMs =
      windowMs - (now.getTime() - existing.windowStart.getTime());
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return {
    ok: true,
    remaining: limit - existing.count - 1,
    retryAfterSeconds: 0,
  };
}