import assert from 'node:assert/strict';
import test from 'node:test';

import { assignRoster } from '../src/roster-assign/index.js';

const agent = (id, capabilities, busy = false) => ({ id, capabilities, busy });

// --- Success paths ---

test('assigns unambiguous single-slot cases', () => {
  const result = assignRoster({
    slots: [{ role: 'dev', requires: ['coding'] }],
    agents: [agent('a1', ['coding'])],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.assignments, [{ role: 'dev', agentId: 'a1' }]);
  assert.deepEqual(result.unfilled, []);
});

test('assignments are in slot declaration order', () => {
  const result = assignRoster({
    slots: [
      { role: 'z', requires: ['z'] },
      { role: 'a', requires: ['a'] },
    ],
    agents: [agent('a1', ['a']), agent('z1', ['z'])],
  });
  assert.deepEqual(result.assignments.map(x => x.role), ['z', 'a']);
});

test('breaks ties by agent id ascending', () => {
  const result = assignRoster({
    slots: [{ role: 'role', requires: ['cap'] }],
    agents: [agent('zeta', ['cap']), agent('alpha', ['cap']), agent('mid', ['cap'])],
  });
  assert.deepEqual(result.assignments, [{ role: 'role', agentId: 'alpha' }]);
});

test('requires all capabilities, not just one', () => {
  const result = assignRoster({
    slots: [{ role: 'verifier', requires: ['testing', 'review'] }],
    agents: [agent('partial', ['testing']), agent('full', ['testing', 'review'])],
  });
  assert.deepEqual(result.assignments, [{ role: 'verifier', agentId: 'full' }]);
});

test('skips busy agents', () => {
  const result = assignRoster({
    slots: [{ role: 'analyst', requires: ['analysis'] }],
    agents: [agent('busy', ['analysis'], true), agent('free', ['analysis'])],
  });
  assert.deepEqual(result.assignments, [{ role: 'analyst', agentId: 'free' }]);
});

test('no agent used twice', () => {
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

test('finds complete assignment even when greedy would fail (two-slot)', () => {
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

test('finds complete assignment across a chain of constrained slots', () => {
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

// --- Failure / partial paths ---

test('empty agent pool leaves all slots unfilled', () => {
  const result = assignRoster({
    slots: [{ role: 'analyst', requires: ['analysis'] }],
    agents: [],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.assignments, []);
  assert.deepEqual(result.unfilled, ['analyst']);
});

test('unfilled slots reported in declaration order', () => {
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

// --- Validation: malformed definitions ---

test('throws TypeError for malformed definitions', () => {
  for (const bad of [null, undefined, 'x', 42, [], {}, { slots: [] }, { agents: [] }]) {
    assert.throws(() => assignRoster(bad), TypeError, `definition ${JSON.stringify(bad)}`);
  }
});

test('throws TypeError for malformed slots', () => {
  const goodAgents = [];
  for (const slot of [
    { role: 'a' },                         // missing requires
    { requires: ['x'] },                   // missing role
    { role: '', requires: ['x'] },         // empty role
    { role: 'a', requires: 'x' },         // requires not array
    { role: 'a', requires: [] },           // requires empty array
    { role: 'a', requires: [''] },         // requires has empty string
  ]) {
    assert.throws(
      () => assignRoster({ slots: [slot], agents: goodAgents }),
      TypeError,
      `slot ${JSON.stringify(slot)}`,
    );
  }
});

test('throws TypeError for malformed agents', () => {
  const goodSlots = [{ role: 'r', requires: ['x'] }];
  for (const a of [
    { id: 'a' },                          // missing capabilities
    { capabilities: [] },                 // missing id
    { id: '', capabilities: [] },         // empty id
    { id: 'a', capabilities: 'x' },      // capabilities not array
    { id: 'a', capabilities: [1] },       // capabilities has non-string
  ]) {
    assert.throws(
      () => assignRoster({ slots: goodSlots, agents: [a] }),
      TypeError,
      `agent ${JSON.stringify(a)}`,
    );
  }
});

test('throws with duplicate_role for duplicate slot roles', () => {
  assert.throws(
    () => assignRoster({
      slots: [{ role: 'r', requires: ['x'] }, { role: 'r', requires: ['x'] }],
      agents: [],
    }),
    /duplicate_role/,
  );
});

// --- Immutability ---

test('does not mutate the input definition', () => {
  const definition = {
    slots: [{ role: 'analyst', requires: ['analysis'] }],
    agents: [agent('a1', ['analysis'])],
  };
  const snapshot = JSON.stringify(definition);
  assignRoster(definition);
  assert.equal(JSON.stringify(definition), snapshot);
});

// --- Additional edge cases ---

test('agent with superset capabilities can fill slot with subset requirements', () => {
  const result = assignRoster({
    slots: [{ role: 'dev', requires: ['coding'] }],
    agents: [agent('polyglot', ['coding', 'testing', 'review'])],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.assignments, [{ role: 'dev', agentId: 'polyglot' }]);
});

test('all busy agents leaves all slots unfilled', () => {
  const result = assignRoster({
    slots: [{ role: 'analyst', requires: ['analysis'] }],
    agents: [agent('a1', ['analysis'], true)],
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.unfilled, ['analyst']);
});

test('ok is true only when every slot is filled', () => {
  const full = assignRoster({
    slots: [{ role: 'a', requires: ['x'] }],
    agents: [agent('a1', ['x'])],
  });
  assert.equal(full.ok, true);

  const partial = assignRoster({
    slots: [{ role: 'a', requires: ['x'] }, { role: 'b', requires: ['y'] }],
    agents: [agent('a1', ['x'])],
  });
  assert.equal(partial.ok, false);
});
