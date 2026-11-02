import assert from 'node:assert/strict';
import test from 'node:test';
import { clampWindow } from '../src/clamp-window.js';
test('stub exports a function', () => {
  assert.equal(typeof clampWindow, 'function');
});
