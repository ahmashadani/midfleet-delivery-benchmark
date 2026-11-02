import assert from 'node:assert/strict';
import test from 'node:test';

import { createLedger } from '../src/lease-ledger/index.js';

const at = ms => ({ now: ms });

// --- createLedger validation ---

test('createLedger throws TypeError for null options', () => {
  assert.throws(() => createLedger(null), TypeError);
});

test('createLedger throws TypeError for missing ttlMs', () => {
  assert.throws(() => createLedger({}), TypeError);
});

test('createLedger throws TypeError for ttlMs = 0', () => {
  assert.throws(() => createLedger({ ttlMs: 0 }), TypeError);
});

test('createLedger throws TypeError for negative ttlMs', () => {
  assert.throws(() => createLedger({ ttlMs: -1 }), TypeError);
});

test('createLedger throws TypeError for fractional ttlMs', () => {
  assert.throws(() => createLedger({ ttlMs: 1.5 }), TypeError);
});

test('createLedger throws TypeError for string ttlMs', () => {
  assert.throws(() => createLedger({ ttlMs: '1000' }), TypeError);
});

test('createLedger succeeds with valid ttlMs', () => {
  assert.doesNotThrow(() => createLedger({ ttlMs: 1000 }));
});

// --- acquire ---

test('acquire returns a lease with correct fields', () => {
  const ledger = createLedger({ ttlMs: 500 });
  const lease = ledger.acquire('run-1', ['analyst'], at(100));
  assert.equal(typeof lease.leaseId, 'string');
  assert.equal(lease.runId, 'run-1');
  assert.deepEqual(lease.roles, ['analyst']);
  assert.equal(lease.expiresAtMs, 600);
});

test('acquire throws already_held when run already has a live lease', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.throws(() => ledger.acquire('run-1', ['reviewer'], at(0)), /already_held/);
});

test('acquire throws role_unavailable when role is taken', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.throws(() => ledger.acquire('run-2', ['analyst'], at(0)), /role_unavailable/);
});

test('acquire is atomic: failed acquire leaves no roles behind', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['reviewer'], at(0));
  assert.throws(() => ledger.acquire('run-2', ['analyst', 'reviewer'], at(0)), /role_unavailable/);
  // 'analyst' must be free (not stranded by the failed acquire)
  assert.equal(ledger.acquire('run-3', ['analyst'], at(0)).runId, 'run-3');
  // run-2 must not appear as held
  assert.equal(ledger.isHeld('run-2', at(0)), false);
});

test('acquire allows role after expiry', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  // at exactly expiresAtMs, the lease is expired
  const lease2 = ledger.acquire('run-2', ['analyst'], at(1000));
  assert.equal(lease2.runId, 'run-2');
});

test('acquire throws TypeError for empty runId', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  assert.throws(() => ledger.acquire('', ['analyst'], at(0)), TypeError);
});

test('acquire throws TypeError for non-string runId', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  assert.throws(() => ledger.acquire(42, ['analyst'], at(0)), TypeError);
});

test('acquire throws TypeError for empty roles array', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  assert.throws(() => ledger.acquire('run-1', [], at(0)), TypeError);
});

test('acquire throws TypeError for duplicate roles', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  assert.throws(() => ledger.acquire('run-1', ['analyst', 'analyst'], at(0)), TypeError);
});

test('acquire throws TypeError for empty string role', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  assert.throws(() => ledger.acquire('run-1', [''], at(0)), TypeError);
});

test('acquire throws TypeError for bad clock', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  assert.throws(() => ledger.acquire('run-1', ['analyst'], { now: -1 }), TypeError);
  assert.throws(() => ledger.acquire('run-1', ['analyst'], null), TypeError);
  assert.throws(() => ledger.acquire('run-1', ['analyst'], { now: '0' }), TypeError);
});

// --- renew ---

test('renew extends lease from renewal moment', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  const renewed = ledger.renew('run-1', at(400));
  assert.equal(renewed.expiresAtMs, 1400);
});

test('renew throws lease_expired when expired', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.throws(() => ledger.renew('run-1', at(1000)), /lease_expired/);
});

test('renew throws lease_not_found for unknown run', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  assert.throws(() => ledger.renew('unknown', at(0)), /lease_not_found/);
});

test('renew throws TypeError for bad arguments', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.throws(() => ledger.renew('', at(0)), TypeError);
  assert.throws(() => ledger.renew('run-1', null), TypeError);
});

// --- release ---

test('release removes lease and frees roles immediately', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst', 'reviewer'], at(0));
  ledger.release('run-1', at(500));
  assert.equal(ledger.isHeld('run-1', at(500)), false);
  assert.deepEqual(ledger.heldRoles(at(500)), []);
});

test('release allows roles to be taken immediately after', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  ledger.release('run-1', at(500));
  assert.equal(ledger.acquire('run-2', ['analyst'], at(500)).runId, 'run-2');
});

test('release throws lease_not_found for unknown run', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  assert.throws(() => ledger.release('unknown', at(0)), /lease_not_found/);
});

test('release throws lease_not_found for already-released lease', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  ledger.release('run-1', at(100));
  assert.throws(() => ledger.release('run-1', at(200)), /lease_not_found/);
});

// --- reap ---

test('reap returns sorted run ids of expired leases', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-b', ['analyst'], at(0));
  ledger.acquire('run-a', ['reviewer'], at(0));
  const reaped = ledger.reap(at(1000));
  assert.deepEqual(reaped, ['run-a', 'run-b']);
});

test('reap leaves live leases alone', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  ledger.acquire('run-2', ['reviewer'], at(600));
  ledger.reap(at(1000));
  assert.deepEqual(ledger.heldRoles(at(1000)), ['reviewer']);
});

test('reap is idempotent', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.deepEqual(ledger.reap(at(1000)), ['run-1']);
  assert.deepEqual(ledger.reap(at(1000)), []);
  assert.deepEqual(ledger.reap(at(5000)), []);
});

test('reap frees roles so they can be acquired again', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  ledger.reap(at(1000));
  assert.equal(ledger.acquire('run-2', ['analyst'], at(1000)).runId, 'run-2');
});

// --- isHeld ---

test('isHeld returns false for expired lease', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.equal(ledger.isHeld('run-1', at(1000)), false);
});

test('isHeld returns true while lease is live', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  assert.equal(ledger.isHeld('run-1', at(999)), true);
});

test('isHeld returns false for unknown run', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  assert.equal(ledger.isHeld('unknown', at(0)), false);
});

// --- heldRoles ---

test('heldRoles returns sorted roles across live leases', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['reviewer', 'analyst'], at(0));
  assert.deepEqual(ledger.heldRoles(at(0)), ['analyst', 'reviewer']);
});

test('heldRoles excludes roles from expired leases', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  ledger.acquire('run-2', ['implementer'], at(500));
  // run-1 expires at 1000, run-2 at 1500
  assert.deepEqual(ledger.heldRoles(at(1000)), ['implementer']);
  assert.deepEqual(ledger.heldRoles(at(1500)), []);
});

// --- snapshot ---

test('snapshot returns live leases sorted by runId', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-b', ['analyst'], at(0));
  ledger.acquire('run-a', ['reviewer'], at(0));
  const snap = ledger.snapshot(at(0));
  assert.deepEqual(snap.map(e => e.runId), ['run-a', 'run-b']);
});

test('snapshot excludes expired leases', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  const snap = ledger.snapshot(at(1000));
  assert.deepEqual(snap, []);
});

test('snapshot returns copies that do not mutate the ledger', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-a', ['reviewer'], at(0));
  const snap = ledger.snapshot(at(0));
  snap[0].roles.push('extra');
  snap.length = 0;
  const snap2 = ledger.snapshot(at(0));
  assert.deepEqual(snap2[0].roles, ['reviewer']);
});

// --- cross-operation consistency ---

test('reaped run cannot be renewed or released', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-1', ['analyst'], at(0));
  ledger.reap(at(1000));
  assert.throws(() => ledger.renew('run-1', at(1000)), /lease_not_found/);
  assert.throws(() => ledger.release('run-1', at(1000)), /lease_not_found/);
});

test('released run cannot be released again', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  ledger.acquire('run-2', ['analyst'], at(1000));
  ledger.release('run-2', at(1100));
  assert.throws(() => ledger.release('run-2', at(1200)), /lease_not_found/);
});

test('expired run can be re-acquired (lease id should differ)', () => {
  const ledger = createLedger({ ttlMs: 1000 });
  const first = ledger.acquire('run-1', ['analyst'], at(0));
  const second = ledger.acquire('run-1', ['analyst'], at(1000));
  assert.notEqual(first.leaseId, second.leaseId);
});
