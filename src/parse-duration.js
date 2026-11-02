/**
 * Parse a compact duration spec into milliseconds.
 *
 * A spec is one or more unit segments joined without separators.
 * Units: ms (milliseconds), s (seconds), m (minutes), h (hours).
 * Segments may appear in any order; a repeated unit is a RangeError.
 * Counts are non-negative integers with no leading zeros.
 * A non-string input throws TypeError; anything malformed throws RangeError.
 *
 * @param {string} spec
 * @returns {number} milliseconds (always a safe integer)
 */
export function parseDuration(spec) {
  if (typeof spec !== 'string') {
    throw new TypeError(`parseDuration: expected a string, got ${typeof spec}`);
  }

  // Must not be empty and must not contain whitespace
  if (spec.length === 0) {
    throw new RangeError('parseDuration: empty string');
  }

  // The full spec must match one or more segments of <digits><unit>.
  // Units in order of longest to shortest to avoid `m` consuming the `m` in `ms`.
  // Pattern for a single segment: (0|[1-9][0-9]*)(ms|s|m|h)
  // We parse left-to-right manually to detect trailing junk and validate each count.

  const UNITS = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
  };

  // Validate the entire string matches the expected pattern before parsing.
  // Regex: one or more groups of (non-negative integer with no leading zero)(unit)
  // No whitespace or other characters allowed anywhere.
  const SEGMENT_RE = /^(?:(?:0|[1-9]\d*)(?:ms|s|m|h))+$/;
  if (!SEGMENT_RE.test(spec)) {
    throw new RangeError(`parseDuration: malformed spec: ${JSON.stringify(spec)}`);
  }

  // Parse segments left-to-right
  const seen = new Set();
  let total = 0;
  let i = 0;

  while (i < spec.length) {
    // Consume digits
    const digitStart = i;
    while (i < spec.length && spec[i] >= '0' && spec[i] <= '9') {
      i++;
    }
    const count = Number(spec.slice(digitStart, i));

    // Consume unit — try 'ms' first (two chars), then single-char units
    let unit;
    if (spec.slice(i, i + 2) === 'ms') {
      unit = 'ms';
      i += 2;
    } else {
      unit = spec[i];
      i += 1;
    }

    if (seen.has(unit)) {
      throw new RangeError(`parseDuration: repeated unit: ${unit}`);
    }
    seen.add(unit);

    total += count * UNITS[unit];
  }

  return total;
}
