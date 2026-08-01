import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { COPY_PLAN, DEV_WORKFLOW_LOGO } from './install.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

test('安装器 LOGO 包含 DEV-WORKFLOW 标识和 3D 阴影字符', () => {
  const plainLogo = DEV_WORKFLOW_LOGO.replace(/\u001b\[[0-9;]*m/g, '')
  assert.match(plainLogo, /DEV-WORKFLOW/)
  assert.match(plainLogo, /░▒▓/)
  assert.ok(plainLogo.split('\n').length >= 7)
})

test('安装器复制 Mermaid 共享工具', () => {
  assert.ok(COPY_PLAN.some((item) => (
    item.srcRel === 'tools/mermaid' && item.destRel === 'tools/mermaid'
  )))
})

test('安装源使用规范化的 figma-sync 目录', () => {
  assert.ok(COPY_PLAN.some((item) => (
    item.srcRel === 'skills/execution' && item.destRel === 'skills/execution'
  )))
  assert.equal(existsSync(path.join(repoRoot, 'skills/execution/figma-sync/SKILL.md')), true)
  assert.equal(existsSync(path.join(repoRoot, 'skills/execution/figmaSync')), false)
})
