// A redirect target taken from the query string is attacker-controlled. Accept
// only a path on this site: one leading slash, and not "//host" or "/\\host",
// which browsers read as another origin.
export function safeRedirectPath(value: string | null, fallback: string): string {
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}
