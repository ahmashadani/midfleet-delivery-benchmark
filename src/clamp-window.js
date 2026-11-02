/**
 * Constrains a number to an inclusive [min, max] range.
 *
 * @param {number} value - The number to clamp.
 * @param {number} min   - The lower bound (inclusive).
 * @param {number} max   - The upper bound (inclusive).
 * @returns {number} The clamped value.
 * @throws {TypeError}  If any argument is not a finite number (typeof !== 'number', NaN, ±Infinity).
 * @throws {RangeError} If min > max.
 */
export function clampWindow(value, min, max) {
  for (const [name, arg] of [['value', value], ['min', min], ['max', max]]) {
    if (typeof arg !== 'number' || !Number.isFinite(arg)) {
      throw new TypeError(
        `clampWindow: ${name} must be a finite number, got ${String(arg)}`
      );
    }
  }

  if (min > max) {
    throw new RangeError(
      `clampWindow: min (${min}) must not be greater than max (${max})`
    );
  }

  if (value < min) return min;
  if (value > max) return max;
  return value;
}
