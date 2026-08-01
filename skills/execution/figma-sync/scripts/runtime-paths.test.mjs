import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  SKILL_ROOT,
  getWorkspaceKey,
  resolveSessionDir,
  resolveSessionLogPath,
  resolveSessionReportDir
} from './_shared/runtime-paths.mjs'

test('从脚本位置稳定推导 figma-sync Skill 根目录', () => {
  assert.equal(path.basename(SKILL_ROOT), 'figma-sync')
  assert.equal(path.basename(path.dirname(SKILL_ROOT)), 'execution')
})

test('不同消费仓库使用互相隔离的临时 session 目录', () => {
  const tempDir = path.join(os.tmpdir(), 'figma-sync-runtime-paths-test')
  const first = resolveSessionDir({ cwd: '/tmp/project-a', tempDir })
  const second = resolveSessionDir({ cwd: '/tmp/project-b', tempDir })

  assert.notEqual(first, second)
  assert.equal(first, resolveSessionDir({ cwd: '/tmp/project-a', tempDir }))
  assert.equal(path.dirname(resolveSessionLogPath({ cwd: '/tmp/project-a', tempDir })), first)
  assert.equal(resolveSessionReportDir({ cwd: '/tmp/project-a', tempDir }), first)
  assert.match(getWorkspaceKey('/tmp/project-a'), /^[a-f0-9]{16}$/)
})
