/**
 * Turn a human-written role name into a URL-safe slug.
 *
 * Rules:
 * - Result is lowercased.
 * - Spaces, underscores and hyphens are separators. A run of them collapses to one
 *   hyphen, and leading/trailing separators are removed.
 * - Characters that are not letters, digits or separators are dropped.
 * - Input yielding no slug (empty, whitespace-only, punctuation-only) throws RangeError.
 * - Non-string input throws TypeError.
 */
export function slugifyRole(name) {
  if (typeof name !== 'string') {
    throw new TypeError(`slugifyRole: expected a string, got ${typeof name}`);
  }

  const slug = name
    .toLowerCase()
    // Replace separators (spaces, underscores, hyphens) with hyphens
    .replace(/[ _-]+/g, '-')
    // Drop characters that are not letters, digits or hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Collapse any runs of hyphens that may have formed after stripping
    .replace(/-{2,}/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');

  if (slug === '') {
    throw new RangeError(`slugifyRole: input "${name}" yields an empty slug`);
  }

  return slug;
}
