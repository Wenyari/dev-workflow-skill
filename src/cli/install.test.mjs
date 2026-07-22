import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEV_WORKFLOW_LOGO } from './install.mjs'

test('安装器 LOGO 包含 DEV-WORKFLOW 标识和 3D 阴影字符', () => {
  const plainLogo = DEV_WORKFLOW_LOGO.replace(/\u001b\[[0-9;]*m/g, '')
  assert.match(plainLogo, /DEV-WORKFLOW/)
  assert.match(plainLogo, /░▒▓/)
  assert.ok(plainLogo.split('\n').length >= 7)
})
