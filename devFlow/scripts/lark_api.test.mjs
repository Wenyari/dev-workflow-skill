import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  splitPathQuery,
  buildLarkcliArgs,
  parseLarkcliSuccess,
  parseLarkcliError
} from './lark_api.mjs'

test('splitPathQuery: 无 query 原样返回，params 为 null', () => {
  const r = splitPathQuery('/open-apis/docx/v1/documents/abc')
  assert.equal(r.path, '/open-apis/docx/v1/documents/abc')
  assert.equal(r.params, null)
})

test('splitPathQuery: 拆出 query 为对象，并解码', () => {
  const r = splitPathQuery('/open-apis/docx/v1/documents/abc/blocks?page_size=500&page_token=t%2B1')
  assert.equal(r.path, '/open-apis/docx/v1/documents/abc/blocks')
  assert.deepEqual(r.params, { page_size: '500', page_token: 't+1' })
})

test('buildLarkcliArgs: GET 无 body 无 query —— 不带 --params/--data/--yes', () => {
  const args = buildLarkcliArgs('GET', '/open-apis/x', { as: 'user', hasBody: false })
  assert.deepEqual(args, ['api', 'GET', '/open-apis/x', '--format', 'json', '--as', 'user'])
})

test('buildLarkcliArgs: GET 带 query —— 加 --params JSON', () => {
  const args = buildLarkcliArgs('GET', '/open-apis/x?a=1&b=2', { as: 'user', hasBody: false })
  assert.ok(args.includes('--params'))
  const idx = args.indexOf('--params')
  assert.deepEqual(JSON.parse(args[idx + 1]), { a: '1', b: '2' })
  assert.ok(!args.includes('--data'))
  assert.ok(!args.includes('--yes'))
})

test('buildLarkcliArgs: POST 带 body —— 加 --data - 和 --yes', () => {
  const args = buildLarkcliArgs('POST', '/open-apis/x', { as: 'bot', hasBody: true })
  assert.ok(args.includes('--as'))
  assert.equal(args[args.indexOf('--as') + 1], 'bot')
  assert.deepEqual(args.slice(args.indexOf('--data'), args.indexOf('--data') + 2), ['--data', '-'])
  assert.ok(args.includes('--yes'))
})

test('parseLarkcliSuccess: {ok,data} 重包成 {code:0,data}', () => {
  const out = JSON.stringify({ ok: true, identity: 'user', data: { items: [1, 2], page_token: 'p' } })
  const r = parseLarkcliSuccess(out)
  assert.equal(r.code, 0)
  assert.deepEqual(r.data, { items: [1, 2], page_token: 'p' })
})

test('parseLarkcliError: 结构化 stderr 取 error.code/message', () => {
  const err = JSON.stringify({ ok: false, error: { code: 99991400, message: 'rate limited', log_id: 'L1' } })
  const r = parseLarkcliError(err, 1)
  assert.equal(r.code, 99991400)
  assert.equal(r.message, 'rate limited')
})

test('parseLarkcliError: 非 JSON stderr 回退', () => {
  const r = parseLarkcliError('boom not json', 1)
  assert.equal(r.code, -1)
  assert.ok(r.message.includes('boom'))
})
