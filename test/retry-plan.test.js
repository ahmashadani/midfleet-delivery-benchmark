import assert from 'node:assert/strict';
import test from 'node:test';

import { nextDelayMs, shouldRetry, planFor } from '../src/retry-plan.js';

const policy = { baseMs: 100, maxMs: 2000, maxAttempts: 5 };

// --- nextDelayMs ---

test('nextDelayMs: returns baseMs at attempt 0', () => {
  assert.equal(nextDelayMs(0, policy), 100);
});

test('nextDelayMs: doubles each attempt', () => {
  assert.equal(nextDelayMs(1, policy), 200);
  assert.equal(nextDelayMs(2, policy), 400);
  assert.equal(nextDelayMs(3, policy), 800);
  assert.equal(nextDelayMs(4, policy), 1600);
});

test('nextDelayMs: caps at maxMs', () => {
  assert.equal(nextDelayMs(5, policy), 2000);
  assert.equal(nextDelayMs(50, policy), 2000);
});

test('nextDelayMs: works when baseMs equals maxMs', () => {
  const p = { baseMs: 1, maxMs: 1, maxAttempts: 3 };
  assert.equal(nextDelayMs(0, p), 1);
  assert.equal(nextDelayMs(1, p), 1);
  assert.equal(nextDelayMs(10, p), 1);
});

test('nextDelayMs: throws TypeError for invalid attempt values', () => {
  for (const bad of [null, undefined, -1, 1.5, '0', NaN, Infinity]) {
    assert.throws(() => nextDelayMs(bad, policy), TypeError);
  }
});

test('nextDelayMs: throws TypeError for invalid policy', () => {
  assert.throws(() => nextDelayMs(0, null), TypeError);
  assert.throws(() => nextDelayMs(0, undefined), TypeError);
  assert.throws(() => nextDelayMs(0, {}), TypeError);
  assert.throws(() => nextDelayMs(0, { baseMs: 100, maxMs: 50, maxAttempts: 5 }), TypeError);
  assert.throws(() => nextDelayMs(0, { baseMs: 0, maxMs: 2000, maxAttempts: 5 }), TypeError);
  assert.throws(() => nextDelayMs(0, { baseMs: 1.5, maxMs: 2000, maxAttempts: 5 }), TypeError);
});

// --- shouldRetry ---

test('shouldRetry: allows attempts below maxAttempts', () => {
  assert.equal(shouldRetry(0, policy), true);
  assert.equal(shouldRetry(4, policy), true);
});

test('shouldRetry: refuses at or beyond maxAttempts', () => {
  assert.equal(shouldRetry(5, policy), false);
  assert.equal(shouldRetry(6, policy), false);
});

test('shouldRetry: refuses when error.permanent is true', () => {
  assert.equal(shouldRetry(0, policy, { permanent: true }), false);
});

test('shouldRetry: allows when error.permanent is false or missing', () => {
  assert.equal(shouldRetry(0, policy, { permanent: false }), true);
  assert.equal(shouldRetry(0, policy, {}), true);
  assert.equal(shouldRetry(0, policy, undefined), true);
});

test('shouldRetry: throws TypeError for invalid attempt values', () => {
  for (const bad of [null, undefined, -1, 1.5, '0', NaN, Infinity]) {
    assert.throws(() => shouldRetry(bad, policy), TypeError);
  }
});

test('shouldRetry: throws TypeError for invalid policy', () => {
  assert.throws(() => shouldRetry(0, null), TypeError);
  assert.throws(() => shouldRetry(0, undefined), TypeError);
  assert.throws(() => shouldRetry(0, {}), TypeError);
});

// --- planFor ---

test('planFor: returns one entry per maxAttempts', () => {
  const plan = planFor(policy);
  assert.equal(plan.length, policy.maxAttempts);
});

test('planFor: attempt field is zero-based sequential', () => {
  const plan = planFor(policy);
  assert.deepEqual(plan.map(s => s.attempt), [0, 1, 2, 3, 4]);
});

test('planFor: delayMs matches nextDelayMs for each attempt', () => {
  const plan = planFor(policy);
  for (const step of plan) {
    assert.equal(step.delayMs, nextDelayMs(step.attempt, policy));
  }
});

test('planFor: elapsedBeforeMs is cumulative sum of previous delays', () => {
  const plan = planFor(policy);
  assert.deepEqual(plan.map(s => s.elapsedBeforeMs), [0, 100, 300, 700, 1500]);
});

test('planFor: totalMs is elapsedBeforeMs + delayMs', () => {
  const plan = planFor(policy);
  for (const step of plan) {
    assert.equal(step.totalMs, step.elapsedBeforeMs + step.delayMs);
  }
  assert.equal(plan.at(-1).totalMs, 3100);
});

test('planFor: all planned attempts pass shouldRetry', () => {
  const plan = planFor(policy);
  for (const step of plan) {
    assert.equal(shouldRetry(step.attempt, policy), true);
  }
  assert.equal(shouldRetry(plan.length, policy), false);
});

test('planFor: works with small policy where baseMs equals maxMs', () => {
  const p = { baseMs: 1, maxMs: 1, maxAttempts: 3 };
  const plan = planFor(p);
  assert.equal(plan.length, 3);
  assert.deepEqual(plan.map(s => s.delayMs), [1, 1, 1]);
  assert.deepEqual(plan.map(s => s.elapsedBeforeMs), [0, 1, 2]);
  assert.equal(plan.at(-1).totalMs, 3);
});

test('planFor: throws TypeError for malformed policies', () => {
  for (const bad of [
    null, undefined, {}, [],
    { baseMs: 0, maxMs: 2000, maxAttempts: 5 },
    { baseMs: 100, maxMs: 50, maxAttempts: 5 },
    { baseMs: 100, maxMs: 2000, maxAttempts: 0 },
    { baseMs: 1.5, maxMs: 2000, maxAttempts: 5 },
    { baseMs: 100, maxMs: 2000 },
  ]) {
    assert.throws(() => planFor(bad), TypeError);
  }
});

test('planFor: agreement with nextDelayMs and shouldRetry across multiple policies', () => {
  for (const candidate of [
    { baseMs: 100, maxMs: 2000, maxAttempts: 5 },
    { baseMs: 1, maxMs: 1, maxAttempts: 3 },
    { baseMs: 250, maxMs: 10_000, maxAttempts: 8 },
  ]) {
    const plan = planFor(candidate);
    assert.equal(plan.length, candidate.maxAttempts);
    for (const step of plan) {
      assert.equal(step.delayMs, nextDelayMs(step.attempt, candidate));
      assert.equal(shouldRetry(step.attempt, candidate), true);
    }
    assert.equal(shouldRetry(plan.length, candidate), false);
  }
});
