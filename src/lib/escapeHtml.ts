// Escapes the five characters that matter for safely interpolating
// untrusted text into an HTML document. Used for user-submitted fields
// (name, reason, etc.) that get embedded in outgoing emails, so a value
// like `<img src=x onerror=...>` renders as inert text instead of
// executing in whatever email client opens the message.
export function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}