import assert from 'node:assert/strict';
import test from 'node:test';

import { slugifyRole } from '../src/slugify-role.js';

// ── exports ───────────────────────────────────────────────────────────────────

test('exports slugifyRole', () => {
  assert.equal(typeof slugifyRole, 'function');
});

// ── lowercasing ───────────────────────────────────────────────────────────────

test('lowercases an all-uppercase name', () => {
  assert.equal(slugifyRole('ANALYST'), 'analyst');
});

test('lowercases a mixed-case name', () => {
  assert.equal(slugifyRole('Product Owner'), 'product-owner');
});

test('lowercases Epic Reviewer', () => {
  assert.equal(slugifyRole('Epic Reviewer'), 'epic-reviewer');
});

// ── separator collapsing ──────────────────────────────────────────────────────

test('collapses multiple spaces to a single hyphen', () => {
  assert.equal(slugifyRole('product   owner'), 'product-owner');
});

test('collapses runs of underscores to a single hyphen', () => {
  assert.equal(slugifyRole('pr__verifier'), 'pr-verifier');
});

test('collapses mixed separators to a single hyphen', () => {
  assert.equal(slugifyRole('a _ - b'), 'a-b');
});

// ── trimming ──────────────────────────────────────────────────────────────────

test('trims leading whitespace', () => {
  assert.equal(slugifyRole('  product owner'), 'product-owner');
});

test('trims trailing whitespace', () => {
  assert.equal(slugifyRole('product owner  '), 'product-owner');
});

test('trims leading and trailing hyphens', () => {
  assert.equal(slugifyRole('--analyst--'), 'analyst');
});

// ── character dropping ────────────────────────────────────────────────────────

test('drops punctuation that is not a separator', () => {
  assert.equal(slugifyRole('Product Owner!'), 'product-owner');
});

test('drops hash and preserves digits', () => {
  assert.equal(slugifyRole('role #2'), 'role-2');
});

test('drops apostrophe', () => {
  assert.equal(slugifyRole("reviewer's"), 'reviewers');
});

test('drops at-signs and special characters', () => {
  assert.equal(slugifyRole('admin@role'), 'adminrole');
});

// ── idempotency ───────────────────────────────────────────────────────────────

test('is idempotent: re-slugifying a slug returns it unchanged', () => {
  for (const name of ['Product Owner', 'pr__verifier', 'role #2', 'ANALYST']) {
    const once = slugifyRole(name);
    assert.equal(slugifyRole(once), once, `idempotent for "${name}"`);
  }
});

// ── single-word and digit inputs ──────────────────────────────────────────────

test('handles a single word', () => {
  assert.equal(slugifyRole('implementer'), 'implementer');
});

test('handles a name that is already a valid slug', () => {
  assert.equal(slugifyRole('product-owner'), 'product-owner');
});

test('handles a purely numeric name', () => {
  assert.equal(slugifyRole('42'), '42');
});

// ── RangeError: empty result ──────────────────────────────────────────────────

test('throws RangeError for empty string', () => {
  assert.throws(() => slugifyRole(''), RangeError);
});

test('throws RangeError for whitespace-only string', () => {
  assert.throws(() => slugifyRole('   '), RangeError);
});

test('throws RangeError for hyphen-only string', () => {
  assert.throws(() => slugifyRole('---'), RangeError);
});

test('throws RangeError for punctuation-only string', () => {
  assert.throws(() => slugifyRole('!!!'), RangeError);
});

test('throws RangeError for underscore-only string', () => {
  assert.throws(() => slugifyRole('___'), RangeError);
});

// ── TypeError: non-string ─────────────────────────────────────────────────────

test('throws TypeError for non-string input', () => {
  for (const bad of [null, undefined, 42, true, [], {}, Symbol('x')]) {
    assert.throws(() => slugifyRole(bad), TypeError, `expected TypeError for ${String(bad)}`);
  }
});
