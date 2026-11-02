// Issue 3 — easy tier. Acceptance criteria, committed before any delivery.

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseDuration } from '../src/parse-duration.js';

test('AC1 parses a single segment into milliseconds', () => {
  assert.equal(parseDuration('500ms'), 500);
  assert.equal(parseDuration('30s'), 30_000);
  assert.equal(parseDuration('5m'), 300_000);
  assert.equal(parseDuration('2h'), 7_200_000);
});

test('AC2 sums multiple segments regardless of the order they appear in', () => {
  assert.equal(parseDuration('1h30m'), 5_400_000);
  assert.equal(parseDuration('30m1h'), 5_400_000);
  assert.equal(parseDuration('1h30m15s500ms'), 5_415_500);
});

test('AC3 rejects a repeated unit', () => {
  assert.throws(() => parseDuration('1h2h'), RangeError);
  assert.throws(() => parseDuration('30m30m'), RangeError);
  // `m` and `ms` are different units and may both appear.
  assert.equal(parseDuration('1m1ms'), 60_001);
});

test('AC4 rejects malformed input', () => {
  for (const bad of ['', '  ', '1', 'h', '1x', '1h30', ' 1h', '1h ', '-1h', '1.5h', '+1h', '1H', '01h']) {
    assert.throws(() => parseDuration(bad), RangeError, `expected RangeError for ${JSON.stringify(bad)}`);
  }
  for (const bad of [null, undefined, 500, 500n, true, [], {}]) {
    assert.throws(() => parseDuration(bad), TypeError, `expected TypeError for ${String(bad)}`);
  }
});

test('AC5 accepts a zero count and always returns a safe integer', () => {
  assert.equal(parseDuration('0s'), 0);
  assert.equal(parseDuration('0h0m0s'), 0);
  assert.equal(Number.isSafeInteger(parseDuration('2h45m30s')), true);
  assert.equal(parseDuration('2h45m30s'), 9_930_000);
});
