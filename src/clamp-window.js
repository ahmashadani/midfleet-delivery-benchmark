/**
 * Constrain a number to an inclusive [min, max] range.
 *
 * @param {number} value - The number to clamp.
 * @param {number} min   - The lower inclusive bound.
 * @param {number} max   - The upper inclusive bound.
 * @returns {number} The clamped value.
 *
 * @throws {TypeError}   If any argument is not a finite number.
 * @throws {RangeError}  If min > max.
 */
export function clampWindow(value, min, max) {
  assertFiniteNumber(value, 'value');
  assertFiniteNumber(min, 'min');
  assertFiniteNumber(max, 'max');

  if (min > max) {
    throw new RangeError(
      `min (${min}) must not be greater than max (${max})`
    );
  }

  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function assertFiniteNumber(arg, name) {
  if (typeof arg !== 'number' || !Number.isFinite(arg)) {
    throw new TypeError(
      `${name} must be a finite number, got ${typeof arg === 'number' ? arg : typeof arg}`
    );
  }
}
