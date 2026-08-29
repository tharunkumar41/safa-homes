// Extracts the client's IP address for use as a rate-limit key.
// Handles both a standard NextRequest (Headers object, has .get()) and
// NextAuth's CredentialsProvider `req`, whose `headers` is a plain
// object (IncomingHttpHeaders-style: string | string[] | undefined).
export function getClientIp(req: {
  headers: Headers | Record<string, string | string[] | undefined>;
}): string {
  const headers = req.headers as any;

  const get = (name: string): string | null => {
    if (headers && typeof headers.get === "function") {
      return headers.get(name);
    }
    const value = headers?.[name];
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  };

  // Set by most reverse proxies / hosting platforms (Vercel, nginx, etc).
  const forwardedFor = get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}