// Issue 7 — long tier. Acceptance criteria, committed before any delivery.
//
// This is the shape the benchmark is really asking about: fourteen criteria over a
// module whose operations interact, where most of it working is not the same as it
// being finished. Partial deliveries here are expected to look complete from the
// inside — every individual operation behaving sensibly while an invariant that spans
// them does not hold.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createLedger } from '../src/lease-ledger/index.js';

const at = ms => ({ now: ms });

test('AC1 acquires a lease and reports it held', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  const lease = ledger.acquire('run-1', ['analyst', 'implementer'], at(0));
  assert.equal(typeof lease.leaseId, 'string');
  assert.equal(lease.runId, 'run-1');
  assert.deepEqual(lease.roles, ['analyst', 'implementer']);
  assert.equal(lease.expiresAtMs, 1000);
  assert.equal(ledger.isHeld('run-1', at(0)), true);
});

test('AC2 refuses to acquire a role already held by another run', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.throws(() => ledger.acquire('run-2', ['analyst'], at(0)), /role_unavailable/);
  // The failed acquisition must leave nothing behind.
  assert.equal(ledger.isHeld('run-2', at(0)), false);
  assert.deepEqual(ledger.heldRoles(at(0)), ['analyst']);
});

test('AC3 allows a different run to take a role once the first lease expires', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.throws(() => ledger.acquire('run-2', ['analyst'], at(999)), /role_unavailable/);
  const second = ledger.acquire('run-2', ['analyst'], at(1000));
  assert.equal(second.runId, 'run-2');
  assert.equal(ledger.isHeld('run-1', at(1000)), false);
});

test('AC4 renews a held lease and extends it from the renewal moment', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  const renewed = ledger.renew('run-1', at(400));
  assert.equal(renewed.expiresAtMs, 1400);
  assert.equal(ledger.isHeld('run-1', at(1399)), true);
});

test('AC5 refuses to renew an expired or unknown lease', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.throws(() => ledger.renew('run-1', at(1000)), /lease_expired/);
  assert.throws(() => ledger.renew('run-missing', at(0)), /lease_not_found/);
});

test('AC6 releases a lease and frees every role it held', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst', 'reviewer'], at(0));
  ledger.release('run-1', at(500));
  assert.equal(ledger.isHeld('run-1', at(500)), false);
  assert.deepEqual(ledger.heldRoles(at(500)), []);
  // Freed immediately, not at the original expiry.
  assert.equal(ledger.acquire('run-2', ['analyst', 'reviewer'], at(500)).runId, 'run-2');
});

test('AC7 reaping releases every expired lease and leaves live ones alone', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  ledger.acquire('run-2', ['reviewer'], at(600));
  const reaped = ledger.reap(at(1000));
  assert.deepEqual(reaped, ['run-1']);
  assert.deepEqual(ledger.heldRoles(at(1000)), ['reviewer']);
});

test('AC8 reaping is idempotent and reports nothing on a second pass', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.deepEqual(ledger.reap(at(1000)), ['run-1']);
  assert.deepEqual(ledger.reap(at(1000)), []);
  assert.deepEqual(ledger.reap(at(5000)), []);
});

test('AC9 an acquisition that fails partway frees every role it had taken', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['reviewer'], at(0));
  // 'analyst' is free, 'reviewer' is not. The whole acquisition must fail atomically.
  assert.throws(() => ledger.acquire('run-2', ['analyst', 'reviewer'], at(0)), /role_unavailable/);
  assert.deepEqual(ledger.heldRoles(at(0)), ['reviewer']);
  assert.equal(ledger.acquire('run-3', ['analyst'], at(0)).runId, 'run-3');
});

test('AC10 a run may hold only one lease at a time', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.throws(() => ledger.acquire('run-1', ['reviewer'], at(0)), /already_held/);
  assert.deepEqual(ledger.heldRoles(at(0)), ['analyst']);
});

test('AC11 heldRoles is sorted ascending and excludes expired leases', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['reviewer', 'analyst'], at(0));
  assert.deepEqual(ledger.heldRoles(at(0)), ['analyst', 'reviewer']);
  ledger.acquire('run-2', ['implementer'], at(500));
  assert.deepEqual(ledger.heldRoles(at(600)), ['analyst', 'implementer', 'reviewer']);
  // run-1 expires at 1000, run-2 at 1500.
  assert.deepEqual(ledger.heldRoles(at(1000)), ['implementer']);
  assert.deepEqual(ledger.heldRoles(at(1500)), []);
});

test('AC12 snapshot reports every live lease, sorted by runId, without exposing internals', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-b', ['analyst'], at(0));
  ledger.acquire('run-a', ['reviewer'], at(0));
  const snapshot = ledger.snapshot(at(0));
  assert.deepEqual(snapshot.map(entry => entry.runId), ['run-a', 'run-b']);
  // Mutating what snapshot hands back must not change the ledger.
  snapshot[0].roles.push('implementer');
  snapshot.length = 0;
  assert.deepEqual(ledger.snapshot(at(0)).map(entry => entry.runId), ['run-a', 'run-b']);
  assert.deepEqual(ledger.snapshot(at(0))[0].roles, ['reviewer']);
});

test('AC13 rejects malformed arguments', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  for (const bad of [null, undefined, 42, '', [], {}]) {
    assert.throws(() => ledger.acquire(bad, ['analyst'], at(0)), TypeError, `runId ${String(bad)}`);
  }
  for (const bad of [null, undefined, 'analyst', [], ['analyst', 'analyst'], [''], [42]]) {
    assert.throws(() => ledger.acquire('run-x', bad, at(0)), TypeError, `roles ${JSON.stringify(bad)}`);
  }
  for (const bad of [null, undefined, {}, { now: '0' }, { now: NaN }, { now: -1 }]) {
    assert.throws(() => ledger.acquire('run-x', ['analyst'], bad), TypeError, `clock ${JSON.stringify(bad)}`);
  }
  for (const bad of [null, undefined, {}, { ttlMs: 0 }, { ttlMs: -1 }, { ttlMs: 1.5 }, { ttlMs: '1000' }]) {
    assert.throws(() => createLedger(bad), TypeError, `options ${JSON.stringify(bad)}`);
  }
});

test('AC14 release and reap are consistent: a reaped run cannot be renewed or released twice', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  ledger.reap(at(1000));
  assert.throws(() => ledger.renew('run-1', at(1000)), /lease_not_found/);
  assert.throws(() => ledger.release('run-1', at(1000)), /lease_not_found/);
  // And a released run is equally gone.
  ledger.acquire('run-2', ['analyst'], at(1000));
  ledger.release('run-2', at(1100));
  assert.throws(() => ledger.release('run-2', at(1200)), /lease_not_found/);
});
