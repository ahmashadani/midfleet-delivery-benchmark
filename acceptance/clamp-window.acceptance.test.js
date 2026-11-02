// Issue 1 — easy tier. Acceptance criteria, committed before any delivery.
//
// These criteria are the specification. Where the issue's prose and a criterion
// disagree, the criterion is authoritative.

import assert from 'node:assert/strict';
import test from 'node:test';

import { clampWindow } from '../src/clamp-window.js';

test('AC1 returns the value unchanged when it already sits inside the bounds', () => {
  assert.equal(clampWindow(5, 0, 10), 5);
  assert.equal(clampWindow(0, 0, 10), 0);
  assert.equal(clampWindow(10, 0, 10), 10);
});

test('AC2 clamps to the nearer bound when the value falls outside', () => {
  assert.equal(clampWindow(-3, 0, 10), 0);
  assert.equal(clampWindow(99, 0, 10), 10);
  assert.equal(clampWindow(-1000, -5, 5), -5);
});

test('AC3 accepts equal bounds and returns that single permitted value', () => {
  assert.equal(clampWindow(7, 3, 3), 3);
  assert.equal(clampWindow(3, 3, 3), 3);
});

test('AC4 rejects inverted bounds and malformed arguments', () => {
  assert.throws(() => clampWindow(5, 10, 0), RangeError);
  for (const bad of [null, undefined, '5', NaN, Infinity, -Infinity, 5n, true, [], {}]) {
    assert.throws(() => clampWindow(bad, 0, 10), TypeError, `value ${String(bad)}`);
    assert.throws(() => clampWindow(5, bad, 10), TypeError, `min ${String(bad)}`);
    assert.throws(() => clampWindow(5, 0, bad), TypeError, `max ${String(bad)}`);
  }
});

test('AC5 preserves fractional values rather than rounding them', () => {
  assert.equal(clampWindow(2.5, 0, 10), 2.5);
  assert.equal(clampWindow(10.5, 0, 10), 10);
  assert.equal(clampWindow(-0.5, 0, 10), 0);
});
