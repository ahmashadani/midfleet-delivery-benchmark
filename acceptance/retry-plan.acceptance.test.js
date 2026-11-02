// Issue 4 — medium tier. Acceptance criteria, committed before any delivery.
//
// Three exports whose behaviour has to agree with each other. AC7 is the one that
// bites: each function can be individually correct while planFor disagrees with the
// two it is built from.

import assert from 'node:assert/strict';
import test from 'node:test';

import { nextDelayMs, shouldRetry, planFor } from '../src/retry-plan.js';

const policy = { baseMs: 100, maxMs: 2000, maxAttempts: 5 };

test('AC1 nextDelayMs doubles from the base and caps at maxMs', () => {
  assert.equal(nextDelayMs(0, policy), 100);
  assert.equal(nextDelayMs(1, policy), 200);
  assert.equal(nextDelayMs(2, policy), 400);
  assert.equal(nextDelayMs(3, policy), 800);
  assert.equal(nextDelayMs(4, policy), 1600);
  assert.equal(nextDelayMs(5, policy), 2000);
  assert.equal(nextDelayMs(50, policy), 2000);
});

test('AC2 shouldRetry allows attempts below the cap and refuses at or beyond it', () => {
  assert.equal(shouldRetry(0, policy), true);
  assert.equal(shouldRetry(4, policy), true);
  assert.equal(shouldRetry(5, policy), false);
  assert.equal(shouldRetry(6, policy), false);
});

test('AC3 shouldRetry refuses outright when the error is marked permanent', () => {
  assert.equal(shouldRetry(0, policy, { permanent: true }), false);
  assert.equal(shouldRetry(0, policy, { permanent: false }), true);
  assert.equal(shouldRetry(0, policy, {}), true);
});

test('AC4 planFor returns one entry per permitted attempt', () => {
  const plan = planFor(policy);
  assert.equal(plan.length, 5);
  assert.deepEqual(plan.map(step => step.attempt), [0, 1, 2, 3, 4]);
  assert.deepEqual(plan.map(step => step.delayMs), [100, 200, 400, 800, 1600]);
});

test('AC5 planFor reports the cumulative wait before each attempt', () => {
  const plan = planFor(policy);
  assert.deepEqual(plan.map(step => step.elapsedBeforeMs), [0, 100, 300, 700, 1500]);
  assert.equal(plan.at(-1).totalMs, 3100);
});

test('AC6 rejects malformed attempts and policies', () => {
  for (const bad of [null, undefined, -1, 1.5, '0', NaN, Infinity]) {
    assert.throws(() => nextDelayMs(bad, policy), TypeError, `attempt ${String(bad)}`);
    assert.throws(() => shouldRetry(bad, policy), TypeError, `attempt ${String(bad)}`);
  }
  for (const bad of [
    null, undefined, {}, [],
    { baseMs: 0, maxMs: 2000, maxAttempts: 5 },
    { baseMs: 100, maxMs: 50, maxAttempts: 5 },
    { baseMs: 100, maxMs: 2000, maxAttempts: 0 },
    { baseMs: 1.5, maxMs: 2000, maxAttempts: 5 },
    { baseMs: 100, maxMs: 2000 },
  ]) {
    assert.throws(() => planFor(bad), TypeError, `policy ${JSON.stringify(bad)}`);
  }
});

test('AC7 the three exports agree: the plan matches what the other two would decide', () => {
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
