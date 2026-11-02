import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugifyRole } from '../src/slugify-role.js';

// Success paths

test('lowercases the result', () => {
  assert.equal(slugifyRole('Product Owner'), 'product-owner');
});

test('converts spaces to hyphens', () => {
  assert.equal(slugifyRole('hello world'), 'hello-world');
});

test('converts underscores to hyphens', () => {
  assert.equal(slugifyRole('pr__verifier'), 'pr-verifier');
});

test('converts hyphens to single hyphen', () => {
  assert.equal(slugifyRole('foo---bar'), 'foo-bar');
});

test('drops non-letter, non-digit, non-separator characters', () => {
  assert.equal(slugifyRole('role #2'), 'role-2');
});

test('handles a mix of separators', () => {
  assert.equal(slugifyRole('foo _ -bar'), 'foo-bar');
});

test('removes leading separators', () => {
  assert.equal(slugifyRole('  leading'), 'leading');
});

test('removes trailing separators', () => {
  assert.equal(slugifyRole('trailing  '), 'trailing');
});

test('slugifying an existing slug returns it unchanged', () => {
  assert.equal(slugifyRole('product-owner'), 'product-owner');
  assert.equal(slugifyRole('pr-verifier'), 'pr-verifier');
  assert.equal(slugifyRole('role-2'), 'role-2');
});

test('handles digits in role name', () => {
  assert.equal(slugifyRole('level2 admin'), 'level2-admin');
});

test('handles single word', () => {
  assert.equal(slugifyRole('admin'), 'admin');
});

test('handles mixed case with separators', () => {
  assert.equal(slugifyRole('Super_Admin'), 'super-admin');
});

// Failure paths

test('throws TypeError for non-string input: number', () => {
  assert.throws(() => slugifyRole(42), TypeError);
});

test('throws TypeError for non-string input: null', () => {
  assert.throws(() => slugifyRole(null), TypeError);
});

test('throws TypeError for non-string input: undefined', () => {
  assert.throws(() => slugifyRole(undefined), TypeError);
});

test('throws TypeError for non-string input: object', () => {
  assert.throws(() => slugifyRole({}), TypeError);
});

test('throws TypeError for non-string input: array', () => {
  assert.throws(() => slugifyRole(['admin']), TypeError);
});

test('throws RangeError for empty string', () => {
  assert.throws(() => slugifyRole(''), RangeError);
});

test('throws RangeError for whitespace-only string', () => {
  assert.throws(() => slugifyRole('   '), RangeError);
});

test('throws RangeError for punctuation-only string', () => {
  assert.throws(() => slugifyRole('!!!'), RangeError);
});

test('throws RangeError for string with only special chars', () => {
  assert.throws(() => slugifyRole('#@$%'), RangeError);
});
