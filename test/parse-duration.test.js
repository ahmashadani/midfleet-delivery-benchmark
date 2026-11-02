import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration } from '../src/parse-duration.js';

// ---------------------------------------------------------------------------
// Success paths
// ---------------------------------------------------------------------------

test('single ms segment', () => {
  assert.equal(parseDuration('500ms'), 500);
});

test('single s segment', () => {
  assert.equal(parseDuration('30s'), 30_000);
});

test('single m segment', () => {
  assert.equal(parseDuration('1m'), 60_000);
});

test('single h segment', () => {
  assert.equal(parseDuration('1h'), 3_600_000);
});

test('combined h and m', () => {
  assert.equal(parseDuration('1h30m'), 5_400_000);
});

test('segments may appear in any order: 30m1h equals 1h30m', () => {
  assert.equal(parseDuration('30m1h'), parseDuration('1h30m'));
});

test('zero value is valid', () => {
  assert.equal(parseDuration('0s'), 0);
  assert.equal(parseDuration('0ms'), 0);
  assert.equal(parseDuration('0m'), 0);
  assert.equal(parseDuration('0h'), 0);
});

test('m and ms are distinct units: 1m1ms is valid', () => {
  assert.equal(parseDuration('1m1ms'), 60_001);
});

test('all four units combined', () => {
  assert.equal(
    parseDuration('1h1m1s1ms'),
    3_600_000 + 60_000 + 1_000 + 1,
  );
});

test('large counts', () => {
  assert.equal(parseDuration('100h'), 100 * 3_600_000);
});

test('result is always a number', () => {
  const result = parseDuration('1s');
  assert.equal(typeof result, 'number');
});

test('result is a safe integer', () => {
  assert.ok(Number.isSafeInteger(parseDuration('1h30m')));
});

// ---------------------------------------------------------------------------
// TypeError paths (non-string input)
// ---------------------------------------------------------------------------

test('throws TypeError for number input', () => {
  assert.throws(() => parseDuration(500), TypeError);
});

test('throws TypeError for null input', () => {
  assert.throws(() => parseDuration(null), TypeError);
});

test('throws TypeError for undefined input', () => {
  assert.throws(() => parseDuration(undefined), TypeError);
});

test('throws TypeError for object input', () => {
  assert.throws(() => parseDuration({ ms: 1 }), TypeError);
});

test('throws TypeError for array input', () => {
  assert.throws(() => parseDuration([500]), TypeError);
});

// ---------------------------------------------------------------------------
// RangeError paths (malformed spec)
// ---------------------------------------------------------------------------

test('throws RangeError for empty string', () => {
  assert.throws(() => parseDuration(''), RangeError);
});

test('throws RangeError for bare number', () => {
  assert.throws(() => parseDuration('500'), RangeError);
});

test('throws RangeError for unknown unit', () => {
  assert.throws(() => parseDuration('1d'), RangeError);
});

test('throws RangeError for uppercase unit H', () => {
  assert.throws(() => parseDuration('1H'), RangeError);
});

test('throws RangeError for uppercase unit S', () => {
  assert.throws(() => parseDuration('1S'), RangeError);
});

test('throws RangeError for uppercase unit M', () => {
  assert.throws(() => parseDuration('1M'), RangeError);
});

test('throws RangeError for uppercase unit MS', () => {
  assert.throws(() => parseDuration('1MS'), RangeError);
});

test('throws RangeError for leading whitespace', () => {
  assert.throws(() => parseDuration(' 1s'), RangeError);
});

test('throws RangeError for trailing whitespace', () => {
  assert.throws(() => parseDuration('1s '), RangeError);
});

test('throws RangeError for whitespace between segments', () => {
  assert.throws(() => parseDuration('1h 30m'), RangeError);
});

test('throws RangeError for leading zeros', () => {
  assert.throws(() => parseDuration('01s'), RangeError);
});

test('throws RangeError for fractional count', () => {
  assert.throws(() => parseDuration('1.5s'), RangeError);
});

test('throws RangeError for negative count', () => {
  assert.throws(() => parseDuration('-1s'), RangeError);
});

test('throws RangeError for positive sign prefix', () => {
  assert.throws(() => parseDuration('+1s'), RangeError);
});

test('throws RangeError for trailing junk', () => {
  assert.throws(() => parseDuration('1sfoo'), RangeError);
});

test('throws RangeError for repeated unit s', () => {
  assert.throws(() => parseDuration('1s2s'), RangeError);
});

test('throws RangeError for repeated unit h', () => {
  assert.throws(() => parseDuration('1h2h'), RangeError);
});

test('throws RangeError for repeated unit m', () => {
  assert.throws(() => parseDuration('1m2m'), RangeError);
});

test('throws RangeError for repeated unit ms', () => {
  assert.throws(() => parseDuration('1ms2ms'), RangeError);
});

test('throws RangeError for spec with only whitespace', () => {
  assert.throws(() => parseDuration('   '), RangeError);
});
