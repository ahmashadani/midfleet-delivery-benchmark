/**
 * slugifyRole(name)
 *
 * Turns a human-written role name into a URL-safe slug.
 *
 * Rules:
 * - Non-string input throws TypeError.
 * - Lowercase the result.
 * - Spaces, underscores and hyphens are separators; a run of them collapses
 *   to one hyphen, and leading/trailing separators are removed.
 * - Characters that are not letters, digits or separators are dropped.
 * - Input that yields no slug throws RangeError.
 *
 * @param {string} name
 * @returns {string}
 */
export function slugifyRole(name) {
  if (typeof name !== 'string') {
    throw new TypeError(`slugifyRole expects a string, got ${typeof name}`);
  }

  const slug = name
    .toLowerCase()
    // Drop characters that are not letters, digits, spaces, underscores or hyphens
    .replace(/[^a-z0-9 _-]/g, '')
    // Collapse runs of separators (space, underscore, hyphen) into a single hyphen
    .replace(/[ _-]+/g, '-')
    // Trim leading and trailing hyphens
    .replace(/^-+|-+$/g, '');

  if (slug === '') {
    throw new RangeError(`slugifyRole: input "${name}" yields no valid slug`);
  }

  return slug;
}
