// Issue 5 — medium tier. Acceptance criteria, committed before any delivery.

import assert from 'node:assert/strict';
import test from 'node:test';

import { createIndex } from '../src/evidence-index.js';

const item = (id, type, stage) => ({ id, type, stage });

test('AC1 adds evidence and finds it by id', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  assert.deepEqual(index.find('e1'), item('e1', 'pull_request', 'implement'));
  assert.equal(index.find('missing'), null);
});

test('AC2 refuses a duplicate id and leaves the first entry intact', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  assert.throws(() => index.add(item('e1', 'ci_run', 'verify')), /duplicate_evidence/);
  assert.equal(index.find('e1').type, 'pull_request');
  assert.equal(index.size(), 1);
});

test('AC3 lists evidence for a stage, sorted by id', () => {
  const index = createIndex();
  index.add(item('e3', 'ci_run', 'verify'));
  index.add(item('e1', 'pull_request', 'implement'));
  index.add(item('e2', 'review', 'verify'));
  assert.deepEqual(index.forStage('verify').map(e => e.id), ['e2', 'e3']);
  assert.deepEqual(index.forStage('implement').map(e => e.id), ['e1']);
  assert.deepEqual(index.forStage('nothing-here'), []);
});

test('AC4 summarises counts by type, with type keys in ascending order', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  index.add(item('e2', 'ci_run', 'verify'));
  index.add(item('e3', 'ci_run', 'verify'));
  assert.deepEqual(index.summarise(), { ci_run: 2, pull_request: 1 });
  assert.deepEqual(Object.keys(index.summarise()), ['ci_run', 'pull_request']);
  assert.deepEqual(createIndex().summarise(), {});
});

test('AC5 reports which required types are missing', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  assert.deepEqual(index.missing(['pull_request', 'ci_run', 'review']), ['ci_run', 'review']);
  assert.deepEqual(index.missing(['pull_request']), []);
  assert.deepEqual(index.missing([]), []);
});

test('AC6 rejects malformed evidence and arguments', () => {
  const index = createIndex();
  for (const bad of [null, undefined, 'e1', 42, [], { id: 'e1' }, { id: 'e1', type: 'x' }]) {
    assert.throws(() => index.add(bad), TypeError, `evidence ${JSON.stringify(bad)}`);
  }
  for (const bad of [{ id: '', type: 'x', stage: 'y' }, { id: 'e', type: '', stage: 'y' }, { id: 'e', type: 'x', stage: '' }, { id: 1, type: 'x', stage: 'y' }]) {
    assert.throws(() => index.add(bad), TypeError, `evidence ${JSON.stringify(bad)}`);
  }
  for (const bad of [null, undefined, 42, [], {}]) {
    assert.throws(() => index.find(bad), TypeError, `id ${String(bad)}`);
    assert.throws(() => index.forStage(bad), TypeError, `stage ${String(bad)}`);
  }
  for (const bad of [null, undefined, 'pull_request', [42], ['']]) {
    assert.throws(() => index.missing(bad), TypeError, `required ${JSON.stringify(bad)}`);
  }
});

test('AC7 reads return copies, so a caller cannot mutate the index through them', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));

  const found = index.find('e1');
  found.type = 'tampered';
  assert.equal(index.find('e1').type, 'pull_request');

  const listed = index.forStage('implement');
  listed.push(item('e9', 'fake', 'implement'));
  assert.equal(index.forStage('implement').length, 1);

  const summary = index.summarise();
  summary.pull_request = 99;
  assert.deepEqual(index.summarise(), { pull_request: 1 });

  // The object handed to add is copied too: mutating it afterwards changes nothing.
  const source = item('e2', 'ci_run', 'verify');
  index.add(source);
  source.type = 'tampered';
  assert.equal(index.find('e2').type, 'ci_run');
});
