import assert from 'node:assert/strict';
import test from 'node:test';

import { slugifyRole } from '../src/slugify-role.js';

// Success paths

test('lowercases a single word', () => {
  assert.equal(slugifyRole('ANALYST'), 'analyst');
});

test('lowercases and joins two words with a hyphen', () => {
  assert.equal(slugifyRole('Product Owner'), 'product-owner');
});

test('collapses multiple spaces into one hyphen', () => {
  assert.equal(slugifyRole('  product   owner  '), 'product-owner');
});

test('collapses underscores into one hyphen', () => {
  assert.equal(slugifyRole('pr__verifier'), 'pr-verifier');
});

test('collapses mixed separators into one hyphen', () => {
  assert.equal(slugifyRole('a _ - b'), 'a-b');
});

test('trims leading and trailing hyphens', () => {
  assert.equal(slugifyRole('--analyst--'), 'analyst');
});

test('drops non-letter non-digit non-separator characters', () => {
  assert.equal(slugifyRole('role #2'), 'role-2');
  assert.equal(slugifyRole('Product Owner!'), 'product-owner');
  assert.equal(slugifyRole("reviewer's"), 'reviewers');
});

test('idempotent: slugifying a slug returns it unchanged', () => {
  const examples = ['Product Owner', 'pr__verifier', 'role #2', 'Epic Reviewer'];
  for (const name of examples) {
    const once = slugifyRole(name);
    assert.equal(slugifyRole(once), once, `not idempotent for "${name}"`);
  }
});

// Failure paths — RangeError

test('throws RangeError for empty string', () => {
  assert.throws(() => slugifyRole(''), RangeError);
});

test('throws RangeError for whitespace-only string', () => {
  assert.throws(() => slugifyRole('   '), RangeError);
});

test('throws RangeError for separator-only strings', () => {
  assert.throws(() => slugifyRole('---'), RangeError);
  assert.throws(() => slugifyRole('___'), RangeError);
});

test('throws RangeError for punctuation-only string', () => {
  assert.throws(() => slugifyRole('!!!'), RangeError);
});

// Failure paths — TypeError

test('throws TypeError for null', () => {
  assert.throws(() => slugifyRole(null), TypeError);
});

test('throws TypeError for undefined', () => {
  assert.throws(() => slugifyRole(undefined), TypeError);
});

test('throws TypeError for number', () => {
  assert.throws(() => slugifyRole(42), TypeError);
});

test('throws TypeError for boolean', () => {
  assert.throws(() => slugifyRole(true), TypeError);
});

test('throws TypeError for array', () => {
  assert.throws(() => slugifyRole([]), TypeError);
});

test('throws TypeError for object', () => {
  assert.throws(() => slugifyRole({}), TypeError);
});

test('throws TypeError for symbol', () => {
  assert.throws(() => slugifyRole(Symbol('x')), TypeError);
});
