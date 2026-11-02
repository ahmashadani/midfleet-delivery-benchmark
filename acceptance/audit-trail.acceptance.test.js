// Issue 9 — long tier. Acceptance criteria, committed before any delivery.
//
// An append-only trail where each entry is chained to the one before it. The chain is
// what makes tampering detectable, and AC10 and AC11 are the criteria that actually
// test it — an implementation can append, read and redact correctly while the chain it
// writes proves nothing.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createTrail } from '../src/audit-trail/index.js';

const at = ms => ({ now: ms });

test('AC1 appends an entry and returns it with a sequence number', () => {
  const trail = createTrail();
  const entry = trail.append({ actor: 'alice', action: 'launch', target: 'run-1' }, at(100));
  assert.equal(entry.seq, 1);
  assert.equal(entry.actor, 'alice');
  assert.equal(entry.action, 'launch');
  assert.equal(entry.target, 'run-1');
  assert.equal(entry.atMs, 100);
  assert.equal(typeof entry.hash, 'string');
  assert.equal(trail.length(), 1);
});

test('AC2 numbers entries from one upwards with no gaps', () => {
  const trail = createTrail();
  for (let i = 0; i < 5; i += 1) {
    trail.append({ actor: 'a', action: 'x', target: `t${i}` }, at(i));
  }
  assert.deepEqual(trail.entries().map(e => e.seq), [1, 2, 3, 4, 5]);
});

test('AC3 refuses an entry timestamped before the previous one', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(100));
  assert.throws(() => trail.append({ actor: 'a', action: 'y', target: 't' }, at(99)), /clock_regression/);
  // Equal timestamps are permitted: two things can happen in the same millisecond.
  assert.equal(trail.append({ actor: 'a', action: 'y', target: 't' }, at(100)).seq, 2);
});

test('AC4 chains each entry to its predecessor', () => {
  const trail = createTrail();
  const first = trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  const second = trail.append({ actor: 'a', action: 'y', target: 't' }, at(2));
  assert.equal(first.previousHash, null);
  assert.equal(second.previousHash, first.hash);
  assert.notEqual(first.hash, second.hash);
});

test('AC5 reads the trail back in order and returns copies', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  const entries = trail.entries();
  assert.deepEqual(entries.map(e => e.actor), ['a', 'b']);
  entries.push({ seq: 99 });
  entries[0].actor = 'tampered';
  assert.equal(trail.entries().length, 2);
  assert.equal(trail.entries()[0].actor, 'a');
});

test('AC6 filters by actor and by action, preserving order', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'launch', target: 't' }, at(1));
  trail.append({ actor: 'b', action: 'launch', target: 'u' }, at(2));
  trail.append({ actor: 'a', action: 'cancel', target: 'v' }, at(3));
  assert.deepEqual(trail.where({ actor: 'a' }).map(e => e.seq), [1, 3]);
  assert.deepEqual(trail.where({ action: 'launch' }).map(e => e.seq), [1, 2]);
  assert.deepEqual(trail.where({ actor: 'a', action: 'launch' }).map(e => e.seq), [1]);
  assert.deepEqual(trail.where({}).map(e => e.seq), [1, 2, 3]);
  assert.deepEqual(trail.where({ actor: 'nobody' }), []);
});

test('AC7 redacts an entry target while keeping it in the chain', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 'secret' }, at(1));
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  const before = trail.entries()[0].hash;
  trail.redact(1, 'contained a credential');
  const after = trail.entries()[0];
  assert.equal(after.target, null);
  assert.equal(after.redacted, true);
  assert.equal(after.redactionReason, 'contained a credential');
  assert.equal(after.seq, 1);
  // Redaction must not rewrite history: the hash is what it always was.
  assert.equal(after.hash, before);
  assert.equal(trail.length(), 2);
});

test('AC8 refuses to redact twice or to redact an unknown entry', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 'secret' }, at(1));
  trail.redact(1, 'first');
  assert.throws(() => trail.redact(1, 'again'), /already_redacted/);
  assert.throws(() => trail.redact(99, 'nope'), /entry_not_found/);
});

test('AC9 rejects malformed entries, clocks and redactions', () => {
  const trail = createTrail();
  for (const bad of [null, undefined, 'x', 42, [], {}, { actor: 'a' }, { actor: 'a', action: 'x' }]) {
    assert.throws(() => trail.append(bad, at(1)), TypeError, `entry ${JSON.stringify(bad)}`);
  }
  for (const bad of [{ actor: '', action: 'x', target: 't' }, { actor: 'a', action: '', target: 't' }, { actor: 'a', action: 'x', target: '' }, { actor: 1, action: 'x', target: 't' }]) {
    assert.throws(() => trail.append(bad, at(1)), TypeError, `entry ${JSON.stringify(bad)}`);
  }
  for (const bad of [null, undefined, {}, { now: '1' }, { now: -1 }, { now: 1.5 }]) {
    assert.throws(() => trail.append({ actor: 'a', action: 'x', target: 't' }, bad), TypeError, `clock ${JSON.stringify(bad)}`);
  }
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  for (const bad of [null, undefined, '1', 0, -1, 1.5]) {
    assert.throws(() => trail.redact(bad, 'why'), TypeError, `seq ${String(bad)}`);
  }
  for (const bad of [null, undefined, '', 42, []]) {
    assert.throws(() => trail.redact(1, bad), TypeError, `reason ${String(bad)}`);
  }
});

test('AC10 verify accepts an untampered trail, including a redacted one', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 'secret' }, at(1));
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  trail.append({ actor: 'c', action: 'z', target: 'v' }, at(3));
  assert.deepEqual(trail.verify(), { ok: true, brokenAt: null });
  trail.redact(2, 'contained a token');
  assert.deepEqual(trail.verify(), { ok: true, brokenAt: null });
});

test('AC11 verify detects a trail whose contents no longer match its chain', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  trail.append({ actor: 'c', action: 'z', target: 'v' }, at(3));

  // Reach past the public surface and alter stored content, the way a compromised
  // store would. A trail that cannot notice this is not an audit trail.
  const tampered = trail.unsafeRawEntries();
  tampered[1].actor = 'mallory';

  assert.deepEqual(trail.verify(), { ok: false, brokenAt: 2 });
});

test('AC12 the trail is append-only: entries cannot be removed or reordered', () => {
  const trail = createTrail();
  trail.append({ actor: 'a', action: 'x', target: 't' }, at(1));
  trail.append({ actor: 'b', action: 'y', target: 'u' }, at(2));
  assert.equal(typeof trail.remove, 'undefined');
  assert.equal(typeof trail.clear, 'undefined');
  assert.equal(typeof trail.insert, 'undefined');
  const seqs = trail.entries().map(e => e.seq);
  assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b));
});
