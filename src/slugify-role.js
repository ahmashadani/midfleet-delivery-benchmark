/**
 * Turn a human-written role name into a URL-safe slug.
 *
 * @param {string} name - The role name to slugify.
 * @returns {string} The URL-safe slug.
 *
 * @throws {TypeError}   If name is not a string.
 * @throws {RangeError}  If name yields no slug (empty, whitespace, punctuation only).
 */
export function slugifyRole(name) {
  if (typeof name !== 'string') {
    throw new TypeError(`name must be a string, got ${typeof name}`);
  }

  const slug = name
    .toLowerCase()
    // Drop characters that are not letters, digits, spaces, underscores or hyphens
    .replace(/[^a-z0-9 _-]/g, '')
    // Collapse runs of separators (space, underscore, hyphen) to a single hyphen
    .replace(/[ _-]+/g, '-')
    // Trim leading and trailing hyphens
    .replace(/^-+|-+$/g, '');

  if (slug.length === 0) {
    throw new RangeError(`"${name}" yields an empty slug`);
  }

  return slug;
}
