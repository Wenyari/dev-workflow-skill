import assert from 'node:assert/strict'
import { test } from 'node:test'
import { moveSelection } from './prompts.mjs'

test('向下和向右移动到下一个选项', () => {
  assert.equal(moveSelection(0, 'down', 3), 1)
  assert.equal(moveSelection(1, 'right', 3), 2)
})

test('向上和向左移动到上一个选项', () => {
  assert.equal(moveSelection(2, 'up', 3), 1)
  assert.equal(moveSelection(1, 'left', 3), 0)
})

test('方向键在首尾循环', () => {
  assert.equal(moveSelection(0, 'up', 3), 2)
  assert.equal(moveSelection(2, 'down', 3), 0)
})

test('其他按键不改变选择', () => {
  assert.equal(moveSelection(1, 'space', 3), 1)
  assert.equal(moveSelection(1, undefined, 3), 1)
})
