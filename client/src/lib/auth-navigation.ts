const AUTH_PATHS = new Set(["/login", "/signup", "/forgot-password", "/logout"]);

/** Accept only same-site absolute paths, never protocol-relative or auth loops. */
export function safeNextUrl(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return null;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin || AUTH_PATHS.has(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
