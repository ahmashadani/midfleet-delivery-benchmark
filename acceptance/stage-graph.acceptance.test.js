// Issue 8 — long tier. Acceptance criteria, committed before any delivery.
//
// A workflow graph: validation, ordering, reachability and transition rules, spread
// over several files. Thirteen criteria, and the later ones depend on the earlier ones
// being right rather than merely plausible.

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

test('AC1 accepts a valid graph and reports its stages in declaration order', () => {
  const graph = createGraph(linear);
  assert.deepEqual(graph.stageIds(), ['analysis', 'implement', 'verify']);
  assert.equal(graph.entry(), 'analysis');
  assert.deepEqual(graph.terminals(), ['verify']);
});

test('AC2 rejects a graph with a duplicate stage id', () => {
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }, { id: 'a', role: 'r' }],
    edges: [],
  }), /duplicate_stage/);
});

test('AC3 rejects an edge naming a stage that does not exist', () => {
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }],
    edges: [{ from: 'a', to: 'ghost', on: 'completed' }],
  }), /unknown_stage/);
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }],
    edges: [{ from: 'ghost', to: 'a', on: 'completed' }],
  }), /unknown_stage/);
});

test('AC4 rejects a cycle and names the stages involved', () => {
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }, { id: 'b', role: 'r' }],
    edges: [
      { from: 'a', to: 'b', on: 'completed' },
      { from: 'b', to: 'a', on: 'completed' },
    ],
  }), /cycle_detected/);
});

test('AC5 rejects a graph with more than one stage that nothing leads to', () => {
  // Two stages with no incoming edge means two possible starting points, so the run
  // has no single entry.
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }, { id: 'b', role: 'r' }],
    edges: [],
  }), /multiple_entry_stages/);
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }, { id: 'b', role: 'r' }, { id: 'orphan', role: 'r' }],
    edges: [
      { from: 'a', to: 'b', on: 'completed' },
      { from: 'orphan', to: 'b', on: 'failed' },
    ],
  }), /multiple_entry_stages/);
});

test('AC6 reports every terminal stage, sorted ascending', () => {
  const graph = createGraph({
    stages: [
      { id: 'implement', role: 'implementer' },
      { id: 'verify', role: 'verifier' },
      { id: 'rework', role: 'implementer' },
      { id: 'accept', role: 'owner' },
    ],
    edges: [
      { from: 'implement', to: 'verify', on: 'completed' },
      { from: 'verify', to: 'accept', on: 'passed' },
      { from: 'verify', to: 'rework', on: 'failed' },
    ],
  });
  assert.deepEqual(graph.terminals(), ['accept', 'rework']);
  assert.equal(graph.entry(), 'implement');
});

test('AC7 returns a topological order consistent with every edge', () => {
  const graph = createGraph({
    stages: [
      { id: 'verify', role: 'verifier' },
      { id: 'analysis', role: 'analyst' },
      { id: 'implement', role: 'implementer' },
      { id: 'review', role: 'reviewer' },
    ],
    edges: [
      { from: 'analysis', to: 'implement', on: 'completed' },
      { from: 'implement', to: 'verify', on: 'completed' },
      { from: 'verify', to: 'review', on: 'passed' },
    ],
  });
  const order = graph.topologicalOrder();
  assert.deepEqual(order, ['analysis', 'implement', 'verify', 'review']);
  for (const edge of graph.edges()) {
    assert.ok(order.indexOf(edge.from) < order.indexOf(edge.to), `${edge.from} must precede ${edge.to}`);
  }
});

test('AC8 resolves the next stage for an outcome, and null at a terminal', () => {
  const graph = createGraph(linear);
  assert.equal(graph.next('analysis', 'completed'), 'implement');
  assert.equal(graph.next('verify', 'completed'), null);
  assert.throws(() => graph.next('analysis', 'exploded'), /unknown_outcome/);
  assert.throws(() => graph.next('ghost', 'completed'), /unknown_stage/);
});

test('AC9 supports branching on different outcomes from one stage', () => {
  const graph = createGraph({
    stages: [
      { id: 'implement', role: 'implementer' },
      { id: 'verify', role: 'verifier' },
      { id: 'rework', role: 'implementer' },
    ],
    edges: [
      { from: 'implement', to: 'verify', on: 'completed' },
      { from: 'verify', to: 'rework', on: 'failed' },
    ],
  });
  assert.equal(graph.next('verify', 'failed'), 'rework');
  assert.deepEqual(graph.outcomesFor('verify'), ['failed']);
  assert.deepEqual(graph.outcomesFor('rework'), []);
});

test('AC10 rejects two edges from the same stage on the same outcome', () => {
  assert.throws(() => createGraph({
    stages: [{ id: 'a', role: 'r' }, { id: 'b', role: 'r' }, { id: 'c', role: 'r' }],
    edges: [
      { from: 'a', to: 'b', on: 'completed' },
      { from: 'a', to: 'c', on: 'completed' },
    ],
  }), /ambiguous_transition/);
});

test('AC11 validates the shape of stages and edges', () => {
  for (const bad of [null, undefined, 'x', 42, [], {}, { stages: [] }, { stages: [{ id: 'a', role: 'r' }] }]) {
    assert.throws(() => createGraph(bad), TypeError, `definition ${JSON.stringify(bad)}`);
  }
  for (const stage of [{ id: 'a' }, { role: 'r' }, { id: '', role: 'r' }, { id: 'a', role: '' }, { id: 1, role: 'r' }]) {
    assert.throws(() => createGraph({ stages: [stage], edges: [] }), TypeError, `stage ${JSON.stringify(stage)}`);
  }
  for (const edge of [{ from: 'a', to: 'a' }, { from: 'a', on: 'c' }, { to: 'a', on: 'c' }, { from: 'a', to: 'a', on: '' }]) {
    assert.throws(() => createGraph({ stages: [{ id: 'a', role: 'r' }], edges: [edge] }), TypeError, `edge ${JSON.stringify(edge)}`);
  }
});

test('AC12 reads return copies, so a caller cannot reshape the graph', () => {
  const graph = createGraph(linear);
  graph.stageIds().push('injected');
  assert.deepEqual(graph.stageIds(), ['analysis', 'implement', 'verify']);
  graph.edges().push({ from: 'verify', to: 'analysis', on: 'completed' });
  assert.equal(graph.edges().length, 2);
  graph.topologicalOrder().reverse();
  assert.equal(graph.topologicalOrder()[0], 'analysis');
});

test('AC13 a graph built from a definition is unaffected by later mutation of it', () => {
  const definition = {
    stages: [{ id: 'a', role: 'r' }, { id: 'b', role: 'r' }],
    edges: [{ from: 'a', to: 'b', on: 'completed' }],
  };
  const graph = createGraph(definition);
  definition.stages.push({ id: 'injected', role: 'r' });
  definition.edges.push({ from: 'b', to: 'injected', on: 'completed' });
  definition.stages[0].id = 'renamed';
  assert.deepEqual(graph.stageIds(), ['a', 'b']);
  assert.equal(graph.next('a', 'completed'), 'b');
  assert.deepEqual(graph.terminals(), ['b']);
});
