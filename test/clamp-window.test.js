import assert from 'node:assert/strict';
import test from 'node:test';

import { clampWindow } from '../src/clamp-window.js';

// --- Success paths ---

test('returns value unchanged when inside the range', () => {
  assert.equal(clampWindow(5, 0, 10), 5);
  assert.equal(clampWindow(0, 0, 10), 0);   // lower bound inclusive
  assert.equal(clampWindow(10, 0, 10), 10); // upper bound inclusive
});

test('clamps to min when value is below range', () => {
  assert.equal(clampWindow(-3, 0, 10), 0);
  assert.equal(clampWindow(-1000, -5, 5), -5);
});

test('clamps to max when value is above range', () => {
  assert.equal(clampWindow(99, 0, 10), 10);
  assert.equal(clampWindow(1000, -5, 5), 5);
});

test('handles equal min and max (single permitted value)', () => {
  assert.equal(clampWindow(7, 3, 3), 3);
  assert.equal(clampWindow(3, 3, 3), 3);
  assert.equal(clampWindow(0, 3, 3), 3);
});

test('preserves fractional values without rounding', () => {
  assert.equal(clampWindow(2.5, 0, 10), 2.5);
  assert.equal(clampWindow(10.5, 0, 10), 10);
  assert.equal(clampWindow(-0.5, 0, 10), 0);
  assert.equal(clampWindow(0.1 + 0.2, 0, 1), 0.1 + 0.2); // no rounding side-effects
});

test('works with negative ranges', () => {
  assert.equal(clampWindow(-3, -10, -1), -3);
  assert.equal(clampWindow(0, -10, -1), -1);
  assert.equal(clampWindow(-20, -10, -1), -10);
});

// --- Failure paths ---

test('throws RangeError when min > max', () => {
  assert.throws(() => clampWindow(5, 10, 0), RangeError);
  assert.throws(() => clampWindow(0, 1, -1), RangeError);
});

test('throws TypeError for non-numeric value argument', () => {
  assert.throws(() => clampWindow(null, 0, 10), TypeError);
  assert.throws(() => clampWindow(undefined, 0, 10), TypeError);
  assert.throws(() => clampWindow('5', 0, 10), TypeError);
  assert.throws(() => clampWindow(NaN, 0, 10), TypeError);
  assert.throws(() => clampWindow(Infinity, 0, 10), TypeError);
  assert.throws(() => clampWindow(-Infinity, 0, 10), TypeError);
  assert.throws(() => clampWindow(5n, 0, 10), TypeError);
  assert.throws(() => clampWindow(true, 0, 10), TypeError);
  assert.throws(() => clampWindow([], 0, 10), TypeError);
  assert.throws(() => clampWindow({}, 0, 10), TypeError);
});

test('throws TypeError for non-numeric min argument', () => {
  assert.throws(() => clampWindow(5, null, 10), TypeError);
  assert.throws(() => clampWindow(5, undefined, 10), TypeError);
  assert.throws(() => clampWindow(5, '0', 10), TypeError);
  assert.throws(() => clampWindow(5, NaN, 10), TypeError);
  assert.throws(() => clampWindow(5, Infinity, 10), TypeError);
  assert.throws(() => clampWindow(5, -Infinity, 10), TypeError);
  assert.throws(() => clampWindow(5, 0n, 10), TypeError);
  assert.throws(() => clampWindow(5, true, 10), TypeError);
  assert.throws(() => clampWindow(5, [], 10), TypeError);
  assert.throws(() => clampWindow(5, {}, 10), TypeError);
});

test('throws TypeError for non-numeric max argument', () => {
  assert.throws(() => clampWindow(5, 0, null), TypeError);
  assert.throws(() => clampWindow(5, 0, undefined), TypeError);
  assert.throws(() => clampWindow(5, 0, '10'), TypeError);
  assert.throws(() => clampWindow(5, 0, NaN), TypeError);
  assert.throws(() => clampWindow(5, 0, Infinity), TypeError);
  assert.throws(() => clampWindow(5, 0, -Infinity), TypeError);
  assert.throws(() => clampWindow(5, 0, 10n), TypeError);
  assert.throws(() => clampWindow(5, 0, true), TypeError);
  assert.throws(() => clampWindow(5, 0, []), TypeError);
  assert.throws(() => clampWindow(5, 0, {}), TypeError);
});
