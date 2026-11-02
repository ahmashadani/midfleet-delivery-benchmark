// Issue 10 — long tier. Acceptance criteria, committed before any delivery.
//
// Assignment under constraints. The individual rules are simple; the difficulty is that
// they interact, and a greedy implementation that satisfies AC1 through AC8 can still
// fail AC9 — where taking the obvious candidate first makes a later slot unfillable.

import assert from 'node:assert/strict';
import test from 'node:test';

import { assignRoster } from '../src/roster-assign/index.js';

const agent = (id, capabilities, busy = false) => ({ id, capabilities, busy });

test('AC1 assigns one agent per slot when the match is unambiguous', () => {
  const result = assignRoster({
    slots: [
      { role: 'analyst', requires: ['analysis'] },
      { role: 'implementer', requires: ['coding'] },
    ],
    agents: [agent('a1', ['analysis']), agent('a2', ['coding'])],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.assignments, [
    { role: 'analyst', agentId: 'a1' },
    { role: 'implementer', agentId: 'a2' },
  ]);
  assert.deepEqual(result.unfilled, []);
});

test('AC2 never assigns the same agent to two slots', () => {
  const result = assignRoster({
    slots: [
      { role: 'analyst', requires: ['analysis'] },
      { role: 'reviewer', requires: ['analysis'] },
    ],
    agents: [agent('a1', ['analysis'])],
  });
  assert.equal(result.ok, false);
  assert.equal(result.assignments.length, 1);
  assert.deepEqual(result.unfilled, ['reviewer']);
});

test('AC3 skips agents that are busy', () => {
  const result = assignRoster({
    slots: [{ role: 'analyst', requires: ['analysis'] }],
    agents: [agent('busy', ['analysis'], true), agent('free', ['analysis'])],
  });
  assert.deepEqual(result.assignments, [{ role: 'analyst', agentId: 'free' }]);
});

test('AC4 requires every listed capability, not merely one of them', () => {
  const result = assignRoster({
    slots: [{ role: 'verifier', requires: ['testing', 'review'] }],
    agents: [agent('partial', ['testing']), agent('full', ['testing', 'review', 'coding'])],
  });
  assert.deepEqual(result.assignments, [{ role: 'verifier', agentId: 'full' }]);
});

test('AC5 reports unfilled slots in the order the slots were declared', () => {
  const result = assignRoster({
    slots: [
      { role: 'analyst', requires: ['analysis'] },
      { role: 'implementer', requires: ['coding'] },
      { role: 'reviewer', requires: ['review'] },
    ],
    agents: [agent('a2', ['coding'])],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.unfilled, ['analyst', 'reviewer']);
  assert.deepEqual(result.assignments, [{ role: 'implementer', agentId: 'a2' }]);
});

test('AC6 breaks ties by agent id ascending, so the result is deterministic', () => {
  const definition = {
    slots: [{ role: 'analyst', requires: ['analysis'] }],
    agents: [agent('zeta', ['analysis']), agent('alpha', ['analysis']), agent('mid', ['analysis'])],
  };
  for (let i = 0; i < 3; i += 1) {
    assert.deepEqual(assignRoster(definition).assignments, [{ role: 'analyst', agentId: 'alpha' }]);
  }
});

test('AC7 assignments are returned in slot declaration order', () => {
  const result = assignRoster({
    slots: [
      { role: 'zebra', requires: ['z'] },
      { role: 'alpha', requires: ['a'] },
    ],
    agents: [agent('a1', ['a']), agent('z1', ['z'])],
  });
  assert.deepEqual(result.assignments.map(a => a.role), ['zebra', 'alpha']);
});

test('AC8 handles an empty agent pool and reports every slot unfilled', () => {
  const result = assignRoster({
    slots: [{ role: 'analyst', requires: ['analysis'] }],
    agents: [],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.assignments, []);
  assert.deepEqual(result.unfilled, ['analyst']);
});

test('AC9 fills every slot when a complete assignment exists, even if a greedy pick would not', () => {
  // 'generalist' can fill either slot; 'specialist' can only fill the second. Taking
  // 'generalist' for the first slot by id order would strand nothing, but taking it for
  // the second strands the first. A complete assignment exists and must be found.
  const result = assignRoster({
    slots: [
      { role: 'reviewer', requires: ['review'] },
      { role: 'analyst', requires: ['analysis'] },
    ],
    agents: [
      agent('generalist', ['review', 'analysis']),
      agent('specialist', ['analysis']),
    ],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.unfilled, []);
  assert.deepEqual(result.assignments, [
    { role: 'reviewer', agentId: 'generalist' },
    { role: 'analyst', agentId: 'specialist' },
  ]);
});

test('AC10 finds a complete assignment across a longer chain of constrained slots', () => {
  const result = assignRoster({
    slots: [
      { role: 's1', requires: ['x'] },
      { role: 's2', requires: ['x', 'y'] },
      { role: 's3', requires: ['x', 'y', 'z'] },
    ],
    agents: [
      agent('broad', ['x', 'y', 'z']),
      agent('mid', ['x', 'y']),
      agent('narrow', ['x']),
    ],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.assignments, [
    { role: 's1', agentId: 'narrow' },
    { role: 's2', agentId: 'mid' },
    { role: 's3', agentId: 'broad' },
  ]);
});

test('AC11 rejects malformed definitions', () => {
  for (const bad of [null, undefined, 'x', 42, [], {}, { slots: [] }, { agents: [] }]) {
    assert.throws(() => assignRoster(bad), TypeError, `definition ${JSON.stringify(bad)}`);
  }
  for (const slot of [{ role: 'a' }, { requires: ['x'] }, { role: '', requires: ['x'] }, { role: 'a', requires: 'x' }, { role: 'a', requires: [] }, { role: 'a', requires: [''] }]) {
    assert.throws(() => assignRoster({ slots: [slot], agents: [] }), TypeError, `slot ${JSON.stringify(slot)}`);
  }
  for (const a of [{ id: 'a' }, { capabilities: [] }, { id: '', capabilities: [] }, { id: 'a', capabilities: 'x' }, { id: 'a', capabilities: [1] }]) {
    assert.throws(() => assignRoster({ slots: [{ role: 'r', requires: ['x'] }], agents: [a] }), TypeError, `agent ${JSON.stringify(a)}`);
  }
  assert.throws(() => assignRoster({
    slots: [{ role: 'r', requires: ['x'] }, { role: 'r', requires: ['x'] }],
    agents: [],
  }), /duplicate_role/);
});

test('AC12 does not mutate the definition it is given', () => {
  const definition = {
    slots: [{ role: 'analyst', requires: ['analysis'] }],
    agents: [agent('a1', ['analysis'])],
  };
  const snapshot = JSON.stringify(definition);
  assignRoster(definition);
  assert.equal(JSON.stringify(definition), snapshot);
});
