/**
 * Parse a compact duration spec into milliseconds.
 *
 * A spec is one or more unit segments joined without separators.
 * Units: ms (milliseconds), s (seconds), m (minutes), h (hours).
 *
 * @param {string} spec
 * @returns {number} duration in milliseconds (a safe integer)
 * @throws {TypeError} if spec is not a string
 * @throws {RangeError} if spec is malformed or contains a repeated unit
 */
export function parseDuration(spec) {
  if (typeof spec !== 'string') {
    throw new TypeError(`parseDuration: expected a string, got ${typeof spec}`);
  }

  // The order matters: 'ms' must be tried before 'm' and 's' so that a
  // leading-digit segment is not incorrectly split.  We match greedily
  // left-to-right: each segment is <digits><unit>.
  //
  // Valid segment regex: one or more digits (no leading zero unless it is the
  // only digit), followed by one of the four unit tokens.
  //
  // We match the whole string exhaustively; any leftover characters mean the
  // spec is malformed.

  const UNITS = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000 };

  // A segment: non-negative integer with no leading zeros, then a unit.
  // The integer part must be (0 | [1-9][0-9]*).
  const SEGMENT_RE = /^(0|[1-9][0-9]*)(ms|s|m|h)/;

  if (spec.length === 0) {
    throw new RangeError('parseDuration: spec must not be empty');
  }

  const seen = new Set();
  let total = 0;
  let remaining = spec;

  while (remaining.length > 0) {
    const m = SEGMENT_RE.exec(remaining);
    if (m === null) {
      throw new RangeError(`parseDuration: malformed spec "${spec}"`);
    }

    const count = Number(m[1]);
    const unit = m[2];

    if (seen.has(unit)) {
      throw new RangeError(`parseDuration: unit "${unit}" appears more than once in "${spec}"`);
    }
    seen.add(unit);

    total += count * UNITS[unit];
    remaining = remaining.slice(m[0].length);
  }

  // Guarantee the result is a safe integer (it will be for any realistic input
  // but the spec requires we assert it).
  if (!Number.isSafeInteger(total)) {
    throw new RangeError(`parseDuration: result ${total} is not a safe integer`);
  }

  return total;
}
