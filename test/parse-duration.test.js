import assert from 'node:assert/strict';
import test from 'node:test';

import { parseDuration } from '../src/parse-duration.js';

// --- Success paths ---

test('single ms segment', () => {
  assert.equal(parseDuration('500ms'), 500);
  assert.equal(parseDuration('0ms'), 0);
  assert.equal(parseDuration('1ms'), 1);
  assert.equal(parseDuration('1000ms'), 1000);
});

test('single s segment', () => {
  assert.equal(parseDuration('1s'), 1000);
  assert.equal(parseDuration('30s'), 30_000);
  assert.equal(parseDuration('0s'), 0);
});

test('single m segment', () => {
  assert.equal(parseDuration('1m'), 60_000);
  assert.equal(parseDuration('5m'), 300_000);
  assert.equal(parseDuration('0m'), 0);
});

test('single h segment', () => {
  assert.equal(parseDuration('1h'), 3_600_000);
  assert.equal(parseDuration('2h'), 7_200_000);
  assert.equal(parseDuration('0h'), 0);
});

test('multiple segments in standard order', () => {
  assert.equal(parseDuration('1h30m'), 5_400_000);
  assert.equal(parseDuration('1h30m15s500ms'), 5_415_500);
  assert.equal(parseDuration('2h45m30s'), 9_930_000);
});

test('segments in any order produce same result', () => {
  assert.equal(parseDuration('30m1h'), parseDuration('1h30m'));
  assert.equal(parseDuration('500ms15s30m1h'), parseDuration('1h30m15s500ms'));
});

test('m and ms are distinct units and may both appear', () => {
  assert.equal(parseDuration('1m1ms'), 60_001);
  assert.equal(parseDuration('1ms1m'), 60_001);
});

test('zero counts are valid', () => {
  assert.equal(parseDuration('0h0m0s'), 0);
  assert.equal(parseDuration('0ms'), 0);
});

test('result is always a safe integer', () => {
  assert.ok(Number.isSafeInteger(parseDuration('2h45m30s')));
  assert.ok(Number.isSafeInteger(parseDuration('0s')));
  assert.ok(Number.isSafeInteger(parseDuration('500ms')));
});

// --- Failure paths: TypeError for non-strings ---

test('throws TypeError for non-string inputs', () => {
  for (const bad of [null, undefined, 500, 500n, true, [], {}]) {
    assert.throws(() => parseDuration(bad), TypeError, `expected TypeError for ${String(bad)}`);
  }
});

// --- Failure paths: RangeError for malformed strings ---

test('throws RangeError for empty string', () => {
  assert.throws(() => parseDuration(''), RangeError);
});

test('throws RangeError for whitespace-only string', () => {
  assert.throws(() => parseDuration('  '), RangeError);
  assert.throws(() => parseDuration('\t'), RangeError);
});

test('throws RangeError for bare number', () => {
  assert.throws(() => parseDuration('1'), RangeError);
  assert.throws(() => parseDuration('100'), RangeError);
});

test('throws RangeError for bare unit', () => {
  assert.throws(() => parseDuration('h'), RangeError);
  assert.throws(() => parseDuration('ms'), RangeError);
});

test('throws RangeError for unknown unit', () => {
  assert.throws(() => parseDuration('1x'), RangeError);
  assert.throws(() => parseDuration('1d'), RangeError);
});

test('throws RangeError for trailing junk after valid segment', () => {
  assert.throws(() => parseDuration('1h30'), RangeError);
  assert.throws(() => parseDuration('1hjunk'), RangeError);
});

test('throws RangeError for leading whitespace', () => {
  assert.throws(() => parseDuration(' 1h'), RangeError);
});

test('throws RangeError for trailing whitespace', () => {
  assert.throws(() => parseDuration('1h '), RangeError);
});

test('throws RangeError for negative count', () => {
  assert.throws(() => parseDuration('-1h'), RangeError);
});

test('throws RangeError for fractional count', () => {
  assert.throws(() => parseDuration('1.5h'), RangeError);
});

test('throws RangeError for explicitly positive count', () => {
  assert.throws(() => parseDuration('+1h'), RangeError);
});

test('throws RangeError for uppercase unit', () => {
  assert.throws(() => parseDuration('1H'), RangeError);
  assert.throws(() => parseDuration('1S'), RangeError);
  assert.throws(() => parseDuration('1M'), RangeError);
  assert.throws(() => parseDuration('1MS'), RangeError);
});

test('throws RangeError for leading zeros', () => {
  assert.throws(() => parseDuration('01h'), RangeError);
  assert.throws(() => parseDuration('001s'), RangeError);
});

test('throws RangeError for repeated unit', () => {
  assert.throws(() => parseDuration('1h2h'), RangeError);
  assert.throws(() => parseDuration('30m30m'), RangeError);
  assert.throws(() => parseDuration('1s2s'), RangeError);
  assert.throws(() => parseDuration('500ms100ms'), RangeError);
});
