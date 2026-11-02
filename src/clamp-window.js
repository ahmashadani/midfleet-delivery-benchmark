/**
 * Constrains a number to an inclusive [min, max] range.
 *
 * @param {number} value - The value to clamp.
 * @param {number} min   - The lower bound (inclusive).
 * @param {number} max   - The upper bound (inclusive).
 * @returns {number} The clamped value.
 * @throws {TypeError}  If any argument is non-numeric or non-finite.
 * @throws {RangeError} If min is greater than max.
 */
export function clampWindow(value, min, max) {
  if (
    typeof value !== 'number' || !Number.isFinite(value) ||
    typeof min   !== 'number' || !Number.isFinite(min)   ||
    typeof max   !== 'number' || !Number.isFinite(max)
  ) {
    throw new TypeError(
      'clampWindow: all arguments must be finite numbers'
    );
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
