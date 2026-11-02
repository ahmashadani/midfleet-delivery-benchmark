// Issue 6 — medium tier. Acceptance criteria, committed before any delivery.
//
// A reservation ledger with a conservation invariant: reserved plus available must
// always equal total, through every sequence of operations. AC7 checks that across a
// long mixed sequence rather than at a single moment, which is where an implementation
// that handles each operation correctly can still drift.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createCapacity } from '../src/capacity-window.js';

test('AC1 reserves capacity and reports what remains', () => {
  const capacity = createCapacity({ total: 10 });
  const ticket = capacity.reserve('run-1', 3);
  assert.equal(ticket.holder, 'run-1');
  assert.equal(ticket.amount, 3);
  assert.equal(capacity.available(), 7);
  assert.equal(capacity.reserved(), 3);
});

test('AC2 refuses a reservation larger than what is available', () => {
  const capacity = createCapacity({ total: 10 });
  capacity.reserve('run-1', 8);
  assert.throws(() => capacity.reserve('run-2', 3), /insufficient_capacity/);
  // The refusal changes nothing.
  assert.equal(capacity.available(), 2);
  assert.equal(capacity.reserved(), 8);
  assert.equal(capacity.reserve('run-2', 2).amount, 2);
});

test('AC3 releases a holder and returns its capacity', () => {
  const capacity = createCapacity({ total: 10 });
  capacity.reserve('run-1', 4);
  capacity.reserve('run-2', 3);
  capacity.release('run-1');
  assert.equal(capacity.available(), 7);
  assert.throws(() => capacity.release('run-1'), /holder_not_found/);
  assert.throws(() => capacity.release('run-missing'), /holder_not_found/);
});

test('AC4 a holder reserving again adds to its existing reservation', () => {
  const capacity = createCapacity({ total: 10 });
  capacity.reserve('run-1', 3);
  const ticket = capacity.reserve('run-1', 2);
  assert.equal(ticket.amount, 5);
  assert.equal(capacity.reserved(), 5);
  // Releasing a holder releases the whole of its reservation, not one portion.
  capacity.release('run-1');
  assert.equal(capacity.available(), 10);
});

test('AC5 reports holders sorted by name with their amounts', () => {
  const capacity = createCapacity({ total: 10 });
  capacity.reserve('run-b', 2);
  capacity.reserve('run-a', 3);
  assert.deepEqual(capacity.holders(), [
    { holder: 'run-a', amount: 3 },
    { holder: 'run-b', amount: 2 },
  ]);
  const listed = capacity.holders();
  listed.push({ holder: 'fake', amount: 99 });
  assert.equal(capacity.holders().length, 2);
});

test('AC6 rejects malformed arguments', () => {
  const capacity = createCapacity({ total: 10 });
  for (const bad of [null, undefined, 42, '', [], {}]) {
    assert.throws(() => capacity.reserve(bad, 1), TypeError, `holder ${String(bad)}`);
    assert.throws(() => capacity.release(bad), TypeError, `holder ${String(bad)}`);
  }
  for (const bad of [null, undefined, 0, -1, 1.5, '1', NaN, Infinity]) {
    assert.throws(() => capacity.reserve('run-x', bad), TypeError, `amount ${String(bad)}`);
  }
  for (const bad of [null, undefined, {}, { total: 0 }, { total: -1 }, { total: 1.5 }, { total: '10' }]) {
    assert.throws(() => createCapacity(bad), TypeError, `options ${JSON.stringify(bad)}`);
  }
});

test('AC7 reserved and available always sum to total across a long mixed sequence', () => {
  const capacity = createCapacity({ total: 20 });
  const check = () => {
    assert.equal(capacity.reserved() + capacity.available(), 20);
    assert.equal(
      capacity.holders().reduce((sum, h) => sum + h.amount, 0),
      capacity.reserved(),
    );
  };

  check();
  for (let i = 0; i < 6; i += 1) {
    capacity.reserve(`run-${i}`, 3);
    check();
  }
  assert.throws(() => capacity.reserve('run-over', 3), /insufficient_capacity/);
  check();

  capacity.release('run-0');
  check();
  capacity.reserve('run-1', 2);
  check();
  for (let i = 1; i < 6; i += 1) {
    capacity.release(`run-${i}`);
    check();
  }
  assert.equal(capacity.available(), 20);
  assert.deepEqual(capacity.holders(), []);
});
