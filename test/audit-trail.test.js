import assert from 'node:assert/strict';
import test from 'node:test';

import { createTrail } from '../src/audit-trail/index.js';

const at = ms => ({ now: ms });

// ── Success paths ──────────────────────────────────────────────────────────────

test('append returns the stored entry with correct fields', () => {
  const trail = createTrail();
  const entry = trail.append({ actor: 'alice', action: 'login', target: 'app' }, at(1000));
  assert.equal(entry.seq, 1);
  assert.equal(entry.actor, 'alice');
  assert.equal(entry.action, 'login');
  assert.equal(entry.target, 'app');
  assert.equal(entry.atMs, 1000);
  assert.equal(typeof entry.hash, 'string');
  assert.equal(entry.previousHash, null);
  assert.equal(entry.redacted, false);
  assert.equal(entry.redactionReason, null);
});

test('seq increments from 1 with no gaps', () => {
  const trail = createTrail();
  for (let i = 1; i <= 5; i++) {
    const e = trail.append({ actor: 'u', action: 'a', target: `t${i}` }, at(i));
    assert.equal(e.seq, i);
  }
  assert.equal(trail.length(), 5);
});

test('previousHash chains entries', () => {
  const trail = createTrail();
  const e1 = trail.append({ actor: 'u', action: 'a', target: 't' }, at(1));
  const e2 = trail.append({ actor: 'u', action: 'b', target: 'u' }, at(2));
  const e3 = trail.append({ actor: 'u', action: 'c', target: 'v' }, at(3));
  assert.equal(e1.previousHash, null);
  assert.equal(e2.previousHash, e1.hash);
  assert.equal(e3.previousHash, e2.hash);
  assert.notEqual(e1.hash, e2.hash);
  assert.notEqual(e2.hash, e3.hash);
});

test('equal timestamps are allowed', () => {
  const trail = createTrail();
  trail.append({ actor: 'u', action: 'a', target: 't' }, at(50));
  assert.doesNotThrow(() => trail.append({ actor: 'u', action: 'b', target: 'u' }, at(50)));
  assert.equal(trail.length(), 2);
});

test('entries() returns copies — mutations do not affect the store', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  const list = trail.entries();
  list.push({ seq: 99 });
  list[0].actor = 'hacked';
  assert.equal(trail.entries().length, 1);
  assert.equal(trail.entries()[0].actor, 'a');
});

test('entries() returns entries in order', () => {
  const trail = createTrail();
  trail.append({ actor: 'z', action: 'first', target: 'a' }, at(1));
  trail.append({ actor: 'a', action: 'second', target: 'b' }, at(2));
  const seqs = trail.entries().map(e => e.seq);
  assert.deepEqual(seqs, [1, 2]);
});

test('where() filters by actor', () => {
  const trail = createTrail();
  trail.append({ actor: 'alice', action: 'x', target: 't' }, at(1));
  trail.append({ actor: 'bob', action: 'x', target: 't' }, at(2));
  trail.append({ actor: 'alice', action: 'y', target: 't' }, at(3));
  assert.deepEqual(trail.where({ actor: 'alice' }).map(e => e.seq), [1, 3]);
  assert.deepEqual(trail.where({ actor: 'bob' }).map(e => e.seq), [2]);
  assert.deepEqual(trail.where({ actor: 'nobody' }), []);
});

test('where() filters by action', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'launch', target: 't' }, at(1));
  trail.append({ actor: 'b', action: 'cancel', target: 'u' }, at(2));
  trail.append({ actor: 'c', action: 'launch', target: 'v' }, at(3));
  assert.deepEqual(trail.where({ action: 'launch' }).map(e => e.seq), [1, 3]);
});

test('where() filters by both actor and action', () => {
  const trail = createTrail();
  trail.append({ actor: 'alice', action: 'launch', target: 't' }, at(1));
  trail.append({ actor: 'alice', action: 'cancel', target: 'u' }, at(2));
  trail.append({ actor: 'bob', action: 'launch', target: 'v' }, at(3));
  assert.deepEqual(trail.where({ actor: 'alice', action: 'launch' }).map(e => e.seq), [1]);
});

test('where({}) matches all entries', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  assert.deepEqual(trail.where({}).map(e => e.seq), [1, 2]);
});

test('where() returns copies', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  const list = trail.where({ actor: 'a' });
  list[0].actor = 'tampered';
  assert.equal(trail.entries()[0].actor, 'a');
});

test('redact() withholds target and marks entry without rewriting hash', () => {
  const trail = createTrail();
  const e = trail.append({ actor: 'a', action: 'x', target: 'secret' }, at(1));
  const originalHash = e.hash;
  trail.redact(1, 'pii');
  const after = trail.entries()[0];
  assert.equal(after.target, null);
  assert.equal(after.redacted, true);
  assert.equal(after.redactionReason, 'pii');
  assert.equal(after.hash, originalHash);
});

test('verify() passes on untampered trail', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  assert.deepEqual(trail.verify(), { ok: true, brokenAt: null });
});

test('verify() passes after redaction', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 'secret' }, at(1));
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  trail.redact(1, 'reason');
  assert.deepEqual(trail.verify(), { ok: true, brokenAt: null });
});

test('verify() detects tampering via unsafeRawEntries()', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  const raw = trail.unsafeRawEntries();
  raw[0].actor = 'mallory';
  assert.deepEqual(trail.verify(), { ok: false, brokenAt: 1 });
});

test('verify() identifies the first broken seq in a chain', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  trail.append({ actor: 'c', action: 'z', target: 'v' }, at(3));
  const raw = trail.unsafeRawEntries();
  raw[1].actor = 'mallory';  // tamper entry at seq=2
  assert.deepEqual(trail.verify(), { ok: false, brokenAt: 2 });
});

test('length() reflects append count', () => {
  const trail = createTrail();
  assert.equal(trail.length(), 0);
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  assert.equal(trail.length(), 1);
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  assert.equal(trail.length(), 2);
});

test('trail has no remove, clear, or insert methods', () => {
  const trail = createTrail();
  assert.equal(typeof trail.remove, 'undefined');
  assert.equal(typeof trail.clear, 'undefined');
  assert.equal(typeof trail.insert, 'undefined');
});

// ── Failure paths ──────────────────────────────────────────────────────────────

test('clock_regression throws', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(100));
  assert.throws(() => trail.append({ actor: 'a', action: 'y', target: 'u' }, at(99)), /clock_regression/);
});

test('malformed entries throw TypeError', () => {
  const trail = createTrail();
  for (const bad of [null, undefined, 'x', 42, [], {}, { actor: 'a' }, { actor: 'a', action: 'x' }]) {
    assert.throws(() => trail.append(bad, at(1)), TypeError);
  }
  for (const bad of [
    { actor: '', action: 'x', target: 't' },
    { actor: 'a', action: '', target: 't' },
    { actor: 'a', action: 'x', target: '' },
    { actor: 1, action: 'x', target: 't' },
  ]) {
    assert.throws(() => trail.append(bad, at(1)), TypeError);
  }
});

test('malformed clocks throw TypeError', () => {
  const trail = createTrail();
  const good = { actor: 'a', action: 'x', target: 't' };
  for (const bad of [null, undefined, {}, { now: '1' }, { now: -1 }, { now: 1.5 }]) {
    assert.throws(() => trail.append(good, bad), TypeError);
  }
});

test('redact with malformed seq throws TypeError', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  for (const bad of [null, undefined, '1', 0, -1, 1.5]) {
    assert.throws(() => trail.redact(bad, 'reason'), TypeError);
  }
});

test('redact with malformed reason throws TypeError', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  for (const bad of [null, undefined, '', 42, []]) {
    assert.throws(() => trail.redact(1, bad), TypeError);
  }
});

test('redact already_redacted throws', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  trail.redact(1, 'first');
  assert.throws(() => trail.redact(1, 'again'), /already_redacted/);
});

test('redact entry_not_found throws', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  assert.throws(() => trail.redact(99, 'nope'), /entry_not_found/);
});
