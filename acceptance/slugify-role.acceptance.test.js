// Issue 2 — easy tier. Acceptance criteria, committed before any delivery.

import assert from 'node:assert/strict';
import test from 'node:test';

import { slugifyRole } from '../src/slugify-role.js';

test('AC1 lowercases and joins words with single hyphens', () => {
  assert.equal(slugifyRole('Product Owner'), 'product-owner');
  assert.equal(slugifyRole('ANALYST'), 'analyst');
  assert.equal(slugifyRole('Epic Reviewer'), 'epic-reviewer');
});

test('AC2 collapses runs of separators and trims them from both ends', () => {
  assert.equal(slugifyRole('  product   owner  '), 'product-owner');
  assert.equal(slugifyRole('pr__verifier'), 'pr-verifier');
  assert.equal(slugifyRole('--analyst--'), 'analyst');
  assert.equal(slugifyRole('a _ - b'), 'a-b');
});

test('AC3 drops characters that are not letters, digits or separators', () => {
  assert.equal(slugifyRole('Product Owner!'), 'product-owner');
  assert.equal(slugifyRole('role #2'), 'role-2');
  assert.equal(slugifyRole("reviewer's"), 'reviewers');
});

test('AC4 rejects input that cannot produce a slug', () => {
  for (const bad of ['', '   ', '---', '!!!', '___']) {
    assert.throws(() => slugifyRole(bad), RangeError, `expected RangeError for ${JSON.stringify(bad)}`);
  }
  for (const bad of [null, undefined, 42, true, [], {}, Symbol('x')]) {
    assert.throws(() => slugifyRole(bad), TypeError, `expected TypeError for ${String(bad)}`);
  }
});

test('AC5 is idempotent: slugifying a slug returns it unchanged', () => {
  for (const name of ['Product Owner', 'pr__verifier', 'role #2']) {
    const once = slugifyRole(name);
    assert.equal(slugifyRole(once), once);
  }
});
