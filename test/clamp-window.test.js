import assert from 'node:assert/strict';
import test from 'node:test';

import { clampWindow } from '../src/clamp-window.js';

// ── exports ───────────────────────────────────────────────────────────────────

test('exports clampWindow', () => {
  assert.equal(typeof clampWindow, 'function');
});

// ── inside range ──────────────────────────────────────────────────────────────

test('returns value unchanged when inside the range', () => {
  assert.equal(clampWindow(5, 0, 10), 5);
});

test('returns min bound when value equals min (inclusive)', () => {
  assert.equal(clampWindow(0, 0, 10), 0);
});

test('returns max bound when value equals max (inclusive)', () => {
  assert.equal(clampWindow(10, 0, 10), 10);
});

// ── below range ───────────────────────────────────────────────────────────────

test('clamps to min when value is below the range', () => {
  assert.equal(clampWindow(-3, 0, 10), 0);
  assert.equal(clampWindow(-1000, -5, 5), -5);
});

// ── above range ───────────────────────────────────────────────────────────────

test('clamps to max when value is above the range', () => {
  assert.equal(clampWindow(99, 0, 10), 10);
});

// ── equal bounds ──────────────────────────────────────────────────────────────

test('accepts equal bounds: any value clamps to that bound', () => {
  assert.equal(clampWindow(7, 3, 3), 3);
  assert.equal(clampWindow(3, 3, 3), 3);
  assert.equal(clampWindow(-1, 3, 3), 3);
});

// ── fractional values ─────────────────────────────────────────────────────────

test('preserves fractional values inside the range', () => {
  assert.equal(clampWindow(2.5, 0, 10), 2.5);
});

test('clamps fractional values above max to max', () => {
  assert.equal(clampWindow(10.5, 0, 10), 10);
});

test('clamps fractional values below min to min', () => {
  assert.equal(clampWindow(-0.5, 0, 10), 0);
});

// ── negative ranges ───────────────────────────────────────────────────────────

test('works with entirely negative ranges', () => {
  assert.equal(clampWindow(-5, -10, -1), -5);
  assert.equal(clampWindow(0, -10, -1), -1);
  assert.equal(clampWindow(-20, -10, -1), -10);
});

// ── RangeError: inverted bounds ───────────────────────────────────────────────

test('throws RangeError when min > max', () => {
  assert.throws(() => clampWindow(5, 10, 0), RangeError);
});

test('throws RangeError for inverted negative bounds', () => {
  assert.throws(() => clampWindow(0, 5, -5), RangeError);
});

// ── TypeError: invalid value ──────────────────────────────────────────────────

test('throws TypeError for non-numeric or non-finite value', () => {
  for (const bad of [null, undefined, '5', NaN, Infinity, -Infinity, 5n, true, [], {}]) {
    assert.throws(() => clampWindow(bad, 0, 10), TypeError, `value: ${String(bad)}`);
  }
});

// ── TypeError: invalid min ────────────────────────────────────────────────────

test('throws TypeError for non-numeric or non-finite min', () => {
  for (const bad of [null, undefined, '5', NaN, Infinity, -Infinity, 5n, true, [], {}]) {
    assert.throws(() => clampWindow(5, bad, 10), TypeError, `min: ${String(bad)}`);
  }
});

// ── TypeError: invalid max ────────────────────────────────────────────────────

test('throws TypeError for non-numeric or non-finite max', () => {
  for (const bad of [null, undefined, '5', NaN, Infinity, -Infinity, 5n, true, [], {}]) {
    assert.throws(() => clampWindow(5, 0, bad), TypeError, `max: ${String(bad)}`);
  }
});
