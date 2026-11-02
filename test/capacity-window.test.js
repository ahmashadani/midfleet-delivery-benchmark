import assert from 'node:assert/strict';
import test from 'node:test';

import { createCapacity } from '../src/capacity-window.js';

// Basic construction
test('createCapacity returns ledger with full availability', () => {
  const c = createCapacity({ total: 100 });
  assert.equal(c.available(), 100);
  assert.equal(c.reserved(), 0);
  assert.deepEqual(c.holders(), []);
});

// Conservation invariant helper
function checkInvariant(capacity, total) {
  const r = capacity.reserved();
  const a = capacity.available();
  assert.equal(r + a, total, `invariant violated: reserved(${r}) + available(${a}) !== ${total}`);
  const holderSum = capacity.holders().reduce((sum, h) => sum + h.amount, 0);
  assert.equal(holderSum, r, `holder amounts (${holderSum}) do not equal reserved (${r})`);
}

// reserve: basic
test('reserve returns ticket with holder and amount', () => {
  const c = createCapacity({ total: 10 });
  const ticket = c.reserve('a', 4);
  assert.equal(ticket.holder, 'a');
  assert.equal(ticket.amount, 4);
  checkInvariant(c, 10);
});

// reserve: adds to existing
test('reserve adds to existing holder reservation', () => {
  const c = createCapacity({ total: 10 });
  c.reserve('a', 3);
  const ticket = c.reserve('a', 2);
  assert.equal(ticket.amount, 5);
  assert.equal(c.reserved(), 5);
  assert.equal(c.available(), 5);
  checkInvariant(c, 10);
});

// reserve: throws on insufficient capacity
test('reserve throws insufficient_capacity when not enough space', () => {
  const c = createCapacity({ total: 10 });
  c.reserve('a', 8);
  assert.throws(() => c.reserve('b', 3), /insufficient_capacity/);
  // State unchanged
  assert.equal(c.available(), 2);
  assert.equal(c.reserved(), 8);
  checkInvariant(c, 10);
});

// reserve: a refused reservation changes nothing
test('refused reservation leaves state unchanged', () => {
  const c = createCapacity({ total: 5 });
  c.reserve('x', 3);
  try { c.reserve('y', 10); } catch (_) {}
  assert.equal(c.available(), 2);
  assert.equal(c.reserved(), 3);
  checkInvariant(c, 5);
});

// reserve: exact capacity
test('reserve works when using exactly all remaining capacity', () => {
  const c = createCapacity({ total: 10 });
  c.reserve('a', 7);
  const ticket = c.reserve('b', 3);
  assert.equal(ticket.amount, 3);
  assert.equal(c.available(), 0);
  assert.equal(c.reserved(), 10);
  checkInvariant(c, 10);
});

// release: basic
test('release frees the full reservation', () => {
  const c = createCapacity({ total: 10 });
  c.reserve('a', 5);
  c.release('a');
  assert.equal(c.available(), 10);
  assert.equal(c.reserved(), 0);
  checkInvariant(c, 10);
});

// release: only the released holder is removed
test('release only removes the specified holder', () => {
  const c = createCapacity({ total: 10 });
  c.reserve('a', 3);
  c.reserve('b', 4);
  c.release('a');
  assert.equal(c.reserved(), 4);
  assert.equal(c.available(), 6);
  const h = c.holders();
  assert.equal(h.length, 1);
  assert.equal(h[0].holder, 'b');
  checkInvariant(c, 10);
});

// release: throws holder_not_found
test('release throws holder_not_found for unknown holder', () => {
  const c = createCapacity({ total: 10 });
  assert.throws(() => c.release('unknown'), /holder_not_found/);
});

test('release throws holder_not_found for already-released holder', () => {
  const c = createCapacity({ total: 10 });
  c.reserve('a', 3);
  c.release('a');
  assert.throws(() => c.release('a'), /holder_not_found/);
});

// holders: sorted by name
test('holders returns entries sorted by name', () => {
  const c = createCapacity({ total: 20 });
  c.reserve('c', 1);
  c.reserve('a', 3);
  c.reserve('b', 2);
  assert.deepEqual(c.holders(), [
    { holder: 'a', amount: 3 },
    { holder: 'b', amount: 2 },
    { holder: 'c', amount: 1 },
  ]);
});

// holders: returns a copy
test('mutating holders() result does not affect ledger', () => {
  const c = createCapacity({ total: 10 });
  c.reserve('a', 3);
  const list = c.holders();
  list.push({ holder: 'fake', amount: 99 });
  list[0].amount = 999;
  assert.equal(c.holders().length, 1);
  assert.equal(c.holders()[0].amount, 3);
});

// TypeError: invalid options
test('createCapacity throws TypeError for invalid options', () => {
  for (const bad of [null, undefined, 42, [], 'str']) {
    assert.throws(() => createCapacity(bad), TypeError);
  }
  for (const bad of [0, -1, 1.5, '10', NaN, Infinity, -Infinity]) {
    assert.throws(() => createCapacity({ total: bad }), TypeError);
  }
  assert.throws(() => createCapacity({}), TypeError);
});

// TypeError: invalid holder
test('reserve throws TypeError for invalid holder', () => {
  const c = createCapacity({ total: 10 });
  for (const bad of [null, undefined, 42, '', [], {}]) {
    assert.throws(() => c.reserve(bad, 1), TypeError);
  }
});

test('release throws TypeError for invalid holder', () => {
  const c = createCapacity({ total: 10 });
  for (const bad of [null, undefined, 42, '', [], {}]) {
    assert.throws(() => c.release(bad), TypeError);
  }
});

// TypeError: invalid amount
test('reserve throws TypeError for invalid amount', () => {
  const c = createCapacity({ total: 10 });
  for (const bad of [null, undefined, 0, -1, 1.5, '1', NaN, Infinity]) {
    assert.throws(() => c.reserve('run-x', bad), TypeError);
  }
});

// Conservation invariant across full sequence
test('conservation invariant holds through a complex sequence', () => {
  const total = 30;
  const c = createCapacity({ total });
  checkInvariant(c, total);

  c.reserve('alpha', 5); checkInvariant(c, total);
  c.reserve('beta', 10); checkInvariant(c, total);
  c.reserve('gamma', 8); checkInvariant(c, total);
  // alpha adds more
  c.reserve('alpha', 3); checkInvariant(c, total);
  // refused reservation
  try { c.reserve('delta', 10); } catch (_) {}
  checkInvariant(c, total);
  // release and re-reserve
  c.release('beta'); checkInvariant(c, total);
  c.reserve('delta', 10); checkInvariant(c, total);
  c.release('alpha'); checkInvariant(c, total);
  c.release('gamma'); checkInvariant(c, total);
  c.release('delta'); checkInvariant(c, total);

  assert.equal(c.available(), total);
  assert.deepEqual(c.holders(), []);
});
