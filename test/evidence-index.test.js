import assert from 'node:assert/strict';
import test from 'node:test';

import { createIndex } from '../src/evidence-index.js';

const item = (id, type, stage) => ({ id, type, stage });

// --- Success paths ---

test('add and find a record by id', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  assert.deepEqual(index.find('e1'), item('e1', 'pull_request', 'implement'));
});

test('find returns null for missing id', () => {
  const index = createIndex();
  assert.equal(index.find('nope'), null);
});

test('size reflects number of records', () => {
  const index = createIndex();
  assert.equal(index.size(), 0);
  index.add(item('e1', 'pull_request', 'implement'));
  assert.equal(index.size(), 1);
  index.add(item('e2', 'ci_run', 'verify'));
  assert.equal(index.size(), 2);
});

test('forStage returns records for a stage sorted by id', () => {
  const index = createIndex();
  index.add(item('e3', 'ci_run', 'verify'));
  index.add(item('e1', 'pull_request', 'implement'));
  index.add(item('e2', 'review', 'verify'));
  assert.deepEqual(index.forStage('verify').map(e => e.id), ['e2', 'e3']);
  assert.deepEqual(index.forStage('implement').map(e => e.id), ['e1']);
});

test('forStage returns empty array when no records match', () => {
  const index = createIndex();
  assert.deepEqual(index.forStage('ghost'), []);
});

test('summarise returns counts by type with sorted keys', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  index.add(item('e2', 'ci_run', 'verify'));
  index.add(item('e3', 'ci_run', 'verify'));
  const summary = index.summarise();
  assert.deepEqual(summary, { ci_run: 2, pull_request: 1 });
  assert.deepEqual(Object.keys(summary), ['ci_run', 'pull_request']);
});

test('summarise returns empty object for empty index', () => {
  assert.deepEqual(createIndex().summarise(), {});
});

test('missing returns sorted list of absent required types', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  assert.deepEqual(index.missing(['pull_request', 'ci_run', 'review']), ['ci_run', 'review']);
  assert.deepEqual(index.missing(['pull_request']), []);
  assert.deepEqual(index.missing([]), []);
});

// --- Failure paths ---

test('add throws duplicate_evidence for duplicate id', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  assert.throws(() => index.add(item('e1', 'ci_run', 'verify')), /duplicate_evidence/);
});

test('add with duplicate id leaves index unchanged', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  assert.throws(() => index.add(item('e1', 'ci_run', 'verify')), /duplicate_evidence/);
  assert.equal(index.find('e1').type, 'pull_request');
  assert.equal(index.size(), 1);
});

test('add throws TypeError for malformed evidence', () => {
  const index = createIndex();
  for (const bad of [null, undefined, 'e1', 42, [], { id: 'e1' }, { id: 'e1', type: 'x' }]) {
    assert.throws(() => index.add(bad), TypeError);
  }
  for (const bad of [
    { id: '', type: 'x', stage: 'y' },
    { id: 'e', type: '', stage: 'y' },
    { id: 'e', type: 'x', stage: '' },
    { id: 1, type: 'x', stage: 'y' },
  ]) {
    assert.throws(() => index.add(bad), TypeError);
  }
});

test('find throws TypeError for non-string id', () => {
  const index = createIndex();
  for (const bad of [null, undefined, 42, [], {}]) {
    assert.throws(() => index.find(bad), TypeError);
  }
});

test('forStage throws TypeError for non-string stage', () => {
  const index = createIndex();
  for (const bad of [null, undefined, 42, [], {}]) {
    assert.throws(() => index.forStage(bad), TypeError);
  }
});

test('missing throws TypeError for invalid requiredTypes argument', () => {
  const index = createIndex();
  for (const bad of [null, undefined, 'pull_request', [42], ['']]) {
    assert.throws(() => index.missing(bad), TypeError);
  }
});

// --- Copy / immutability ---

test('find returns a copy; mutating it does not affect the index', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  const found = index.find('e1');
  found.type = 'tampered';
  assert.equal(index.find('e1').type, 'pull_request');
});

test('forStage returns a copy; mutating it does not affect the index', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  const listed = index.forStage('implement');
  listed.push(item('e9', 'fake', 'implement'));
  assert.equal(index.forStage('implement').length, 1);
});

test('summarise returns a copy; mutating it does not affect the index', () => {
  const index = createIndex();
  index.add(item('e1', 'pull_request', 'implement'));
  const summary = index.summarise();
  summary.pull_request = 99;
  assert.deepEqual(index.summarise(), { pull_request: 1 });
});

test('add copies the input; mutating source afterwards does not affect the index', () => {
  const index = createIndex();
  const source = item('e1', 'ci_run', 'verify');
  index.add(source);
  source.type = 'tampered';
  assert.equal(index.find('e1').type, 'ci_run');
});
