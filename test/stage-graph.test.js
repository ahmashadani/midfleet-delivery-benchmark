import assert from 'node:assert/strict';
import test from 'node:test';
import { createGraph } from '../src/stage-graph/index.js';

const linear = {
  stages: [
    { id: 'analysis', role: 'analyst' },
    { id: 'implement', role: 'implementer' },
    { id: 'verify', role: 'verifier' },
  ],
  edges: [
    { from: 'analysis', to: 'implement', on: 'completed' },
    { from: 'implement', to: 'verify', on: 'completed' },
  ],
};

test('stageIds returns ids in declaration order', () => {
  const g = createGraph(linear);
  assert.deepEqual(g.stageIds(), ['analysis', 'implement', 'verify']);
});

test('entry returns the single stage with no incoming edges', () => {
  const g = createGraph(linear);
  assert.equal(g.entry(), 'analysis');
});

test('terminals returns stages with no outgoing edges sorted ascending', () => {
  const g = createGraph(linear);
  assert.deepEqual(g.terminals(), ['verify']);
});

test('topologicalOrder respects edge ordering', () => {
  const g = createGraph(linear);
  const order = g.topologicalOrder();
  assert.equal(order.indexOf('analysis') < order.indexOf('implement'), true);
  assert.equal(order.indexOf('implement') < order.indexOf('verify'), true);
});

test('next returns destination stage id for a valid outcome', () => {
  const g = createGraph(linear);
  assert.equal(g.next('analysis', 'completed'), 'implement');
  assert.equal(g.next('implement', 'completed'), 'verify');
});

test('next returns null for a terminal stage', () => {
  const g = createGraph(linear);
  assert.equal(g.next('verify', 'completed'), null);
});

test('next throws unknown_outcome for invalid outcome on non-terminal', () => {
  const g = createGraph(linear);
  assert.throws(() => g.next('analysis', 'nope'), /unknown_outcome/);
});

test('next throws unknown_stage for a stage that does not exist', () => {
  const g = createGraph(linear);
  assert.throws(() => g.next('ghost', 'completed'), /unknown_stage/);
});

test('outcomesFor returns sorted outcomes for a stage', () => {
  const g = createGraph({
    stages: [
      { id: 'a', role: 'r' },
      { id: 'b', role: 'r' },
      { id: 'c', role: 'r' },
    ],
    edges: [
      { from: 'a', to: 'b', on: 'completed' },
      { from: 'a', to: 'c', on: 'abandoned' },
    ],
  });
  assert.deepEqual(g.outcomesFor('a'), ['abandoned', 'completed']);
  assert.deepEqual(g.outcomesFor('b'), []);
});

test('outcomesFor throws unknown_stage for non-existent stage', () => {
  const g = createGraph(linear);
  assert.throws(() => g.outcomesFor('ghost'), /unknown_stage/);
});

test('throws duplicate_stage when two stages share an id', () => {
  assert.throws(() => createGraph({
    stages: [{ id: 'x', role: 'r' }, { id: 'x', role: 'r' }],
    edges: [],
  }), /duplicate_stage/);
});

test('throws unknown_stage when an edge references a missing stage', () => {
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }],
    edges: [{ from: 'a', to: 'missing', on: 'done' }],
  }), /unknown_stage/);
});

test('throws cycle_detected when graph has a cycle', () => {
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }, { id: 'b', role: 'r' }],
    edges: [
      { from: 'a', to: 'b', on: 'done' },
      { from: 'b', to: 'a', on: 'done' },
    ],
  }), /cycle_detected/);
});

test('throws multiple_entry_stages when more than one stage has no incoming edges', () => {
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }, { id: 'b', role: 'r' }],
    edges: [],
  }), /multiple_entry_stages/);
});

test('throws ambiguous_transition when two edges share same from+outcome', () => {
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }, { id: 'b', role: 'r' }, { id: 'c', role: 'r' }],
    edges: [
      { from: 'a', to: 'b', on: 'done' },
      { from: 'a', to: 'c', on: 'done' },
    ],
  }), /ambiguous_transition/);
});

test('throws TypeError for malformed definitions', () => {
  for (const bad of [null, undefined, 'x', 42, [], {}]) {
    assert.throws(() => createGraph(bad), TypeError);
  }
});

test('throws TypeError for malformed stages', () => {
  assert.throws(() => createGraph({ stages: [{ id: '', role: 'r' }], edges: [] }), TypeError);
  assert.throws(() => createGraph({ stages: [{ id: 'a', role: '' }], edges: [] }), TypeError);
  assert.throws(() => createGraph({ stages: [{ id: 1, role: 'r' }], edges: [] }), TypeError);
  assert.throws(() => createGraph({ stages: [{ role: 'r' }], edges: [] }), TypeError);
  assert.throws(() => createGraph({ stages: [{ id: 'a' }], edges: [] }), TypeError);
});

test('throws TypeError for malformed edges', () => {
  assert.throws(() => createGraph({ stages: [{ id: 'a', role: 'r' }], edges: [{ from: 'a', to: 'a', on: '' }] }), TypeError);
  assert.throws(() => createGraph({ stages: [{ id: 'a', role: 'r' }], edges: [{ from: 'a', on: 'c' }] }), TypeError);
  assert.throws(() => createGraph({ stages: [{ id: 'a', role: 'r' }], edges: [{ to: 'a', on: 'c' }] }), TypeError);
});

test('reads return copies — mutations do not affect graph', () => {
  const g = createGraph(linear);
  g.stageIds().push('injected');
  assert.deepEqual(g.stageIds(), ['analysis', 'implement', 'verify']);
  g.edges().push({ from: 'verify', to: 'analysis', on: 'done' });
  assert.equal(g.edges().length, 2);
  g.terminals().push('fake');
  assert.deepEqual(g.terminals(), ['verify']);
  g.topologicalOrder().reverse();
  assert.equal(g.topologicalOrder()[0], 'analysis');
});

test('graph is independent of definition mutations', () => {
  const definition = {
    stages: [{ id: 'a', role: 'r' }, { id: 'b', role: 'r' }],
    edges: [{ from: 'a', to: 'b', on: 'done' }],
  };
  const g = createGraph(definition);
  definition.stages.push({ id: 'c', role: 'r' });
  definition.stages[0].id = 'renamed';
  assert.deepEqual(g.stageIds(), ['a', 'b']);
  assert.equal(g.next('a', 'done'), 'b');
});

test('multiple terminal stages are sorted ascending', () => {
  const g = createGraph({
    stages: [
      { id: 'start', role: 'r' },
      { id: 'zebra', role: 'r' },
      { id: 'apple', role: 'r' },
    ],
    edges: [
      { from: 'start', to: 'zebra', on: 'pass' },
      { from: 'start', to: 'apple', on: 'fail' },
    ],
  });
  assert.deepEqual(g.terminals(), ['apple', 'zebra']);
});

test('branching graph: next resolves correctly per outcome', () => {
  const g = createGraph({
    stages: [
      { id: 'check', role: 'checker' },
      { id: 'ok', role: 'approver' },
      { id: 'fix', role: 'fixer' },
    ],
    edges: [
      { from: 'check', to: 'ok', on: 'pass' },
      { from: 'check', to: 'fix', on: 'fail' },
    ],
  });
  assert.equal(g.next('check', 'pass'), 'ok');
  assert.equal(g.next('check', 'fail'), 'fix');
  assert.equal(g.next('ok', 'anything'), null);
});
