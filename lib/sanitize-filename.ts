/** Strips a URL scheme and replaces filesystem-unsafe characters, for building a filename out of a domain/URL var. */
export function sanitizeForFilename(value: string): string {
  return value
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
