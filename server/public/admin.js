'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { csv } = require('../src/config');

test('csv trims and removes empty entries', () => {
  assert.deepEqual(csv(' a, ,b , c '), ['a', 'b', 'c']);
});

test('csv returns an empty array for blank values', () => {
  assert.deepEqual(csv(' , , '), []);
});
