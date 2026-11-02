import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampWindow } from '../src/clamp-window.js';

// --- Success paths ---

test('returns value unchanged when inside range', () => {
  assert.equal(clampWindow(5, 0, 10), 5);
});

test('returns value unchanged when equal to min', () => {
  assert.equal(clampWindow(0, 0, 10), 0);
});

test('returns value unchanged when equal to max', () => {
  assert.equal(clampWindow(10, 0, 10), 10);
});

test('clamps to min when value is below range', () => {
  assert.equal(clampWindow(-3, 0, 10), 0);
});

test('clamps to max when value is above range', () => {
  assert.equal(clampWindow(99, 0, 10), 10);
});

test('works when min equals max and value matches', () => {
  assert.equal(clampWindow(7, 7, 7), 7);
});

test('clamps to sole value when min equals max and value is below', () => {
  assert.equal(clampWindow(3, 7, 7), 7);
});

test('clamps to sole value when min equals max and value is above', () => {
  assert.equal(clampWindow(12, 7, 7), 7);
});

test('passes fractional values through without rounding', () => {
  assert.equal(clampWindow(3.7, 0, 10), 3.7);
});

test('clamps fractional values to fractional bounds', () => {
  assert.equal(clampWindow(0.5, 1.5, 9.5), 1.5);
  assert.equal(clampWindow(10.5, 1.5, 9.5), 9.5);
});

test('works with negative ranges', () => {
  assert.equal(clampWindow(-5, -10, -1), -5);
  assert.equal(clampWindow(-15, -10, -1), -10);
  assert.equal(clampWindow(0, -10, -1), -1);
});

// --- Failure paths: RangeError ---

test('throws RangeError when min is greater than max', () => {
  assert.throws(
    () => clampWindow(5, 10, 0),
    RangeError,
  );
});

test('throws RangeError when min strictly exceeds max with fractional values', () => {
  assert.throws(
    () => clampWindow(1, 2.5, 2.4),
    RangeError,
  );
});

// --- Failure paths: TypeError ---

test('throws TypeError when value is NaN', () => {
  assert.throws(() => clampWindow(NaN, 0, 10), TypeError);
});

test('throws TypeError when value is Infinity', () => {
  assert.throws(() => clampWindow(Infinity, 0, 10), TypeError);
});

test('throws TypeError when value is -Infinity', () => {
  assert.throws(() => clampWindow(-Infinity, 0, 10), TypeError);
});

test('throws TypeError when value is a string', () => {
  assert.throws(() => clampWindow('5', 0, 10), TypeError);
});

test('throws TypeError when value is null', () => {
  assert.throws(() => clampWindow(null, 0, 10), TypeError);
});

test('throws TypeError when value is undefined', () => {
  assert.throws(() => clampWindow(undefined, 0, 10), TypeError);
});

test('throws TypeError when min is NaN', () => {
  assert.throws(() => clampWindow(5, NaN, 10), TypeError);
});

test('throws TypeError when min is Infinity', () => {
  assert.throws(() => clampWindow(5, Infinity, 10), TypeError);
});

test('throws TypeError when min is a string', () => {
  assert.throws(() => clampWindow(5, '0', 10), TypeError);
});

test('throws TypeError when max is NaN', () => {
  assert.throws(() => clampWindow(5, 0, NaN), TypeError);
});

test('throws TypeError when max is -Infinity', () => {
  assert.throws(() => clampWindow(5, 0, -Infinity), TypeError);
});

test('throws TypeError when max is a string', () => {
  assert.throws(() => clampWindow(5, 0, '10'), TypeError);
});
