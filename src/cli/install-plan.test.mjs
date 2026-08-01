import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import {
  buildCopyPlan,
  FIGMA_SKILL_DIR,
  findWorkspaceRoot,
  HAW_FILENAME,
  inspectLegacySkillInstall,
  LEGACY_FIGMA_SKILL_DIR
} from './install.mjs'
import { copyFile, CONFLICT, CONFLICT_DECISION } from './copy.mjs'

test('安装计划把 skill 目录放到 agent 根，把协作规范放到项目根', () => {
  const cwd = path.resolve('/repo')
  const targetAbs = path.join(cwd, '.agents')
  const pkgRoot = path.resolve('/package')
  const plan = buildCopyPlan({ cwd, targetAbs, pkgRoot })

  const skill = plan.find(item => item.srcRel === 'skills/execution')
  assert.equal(skill.destAbs, path.join(targetAbs, 'skills/execution'))

  const workflow = plan.find(item => item.srcRel === HAW_FILENAME)
  assert.equal(workflow.kind, 'file')
  assert.equal(workflow.srcAbs, path.join(pkgRoot, HAW_FILENAME))
  assert.equal(workflow.destAbs, path.join(cwd, HAW_FILENAME))
})

test('从仓库子目录向上定位 Git 根目录', async t => {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-workflow-root-test-'))
  t.after(() => fs.rm(repoRoot, { recursive: true, force: true }))
  await fs.mkdir(path.join(repoRoot, '.git'))
  const nested = path.join(repoRoot, 'packages', 'admin')
  await fs.mkdir(nested, { recursive: true })

  assert.equal(await findWorkspaceRoot(nested), repoRoot)
})

test('非 Git 目录不伪造仓库根目录', async t => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-workflow-no-git-test-'))
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }))

  assert.equal(await findWorkspaceRoot(tempRoot), null)
})

test('识别旧 figmaSync 目录并区分新目录是否已存在', async t => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-workflow-legacy-test-'))
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }))
  const targetAbs = path.join(tempRoot, '.agents')
  await fs.mkdir(path.join(targetAbs, LEGACY_FIGMA_SKILL_DIR), { recursive: true })

  const legacyOnly = await inspectLegacySkillInstall(targetAbs)
  assert.equal(legacyOnly.legacyExists, true)
  assert.equal(legacyOnly.canonicalExists, false)

  await fs.mkdir(path.join(targetAbs, FIGMA_SKILL_DIR), { recursive: true })
  const duplicated = await inspectLegacySkillInstall(targetAbs)
  assert.equal(duplicated.legacyExists, true)
  assert.equal(duplicated.canonicalExists, true)
})

async function createConflictFixture(t) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-workflow-install-test-'))
  t.after(() => fs.rm(tempRoot, { recursive: true, force: true }))
  const src = path.join(tempRoot, 'source.md')
  const dest = path.join(tempRoot, 'project', HAW_FILENAME)
  await fs.writeFile(src, 'package version')
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.writeFile(dest, 'project version')
  return { src, dest }
}

test('根文件冲突选择跳过时保留项目版本', async t => {
  const { src, dest } = await createConflictFixture(t)
  const stats = await copyFile(src, dest, { conflict: CONFLICT.SKIP })

  assert.deepEqual(stats, { copied: 0, skipped: 1, overwritten: 0 })
  assert.equal(await fs.readFile(dest, 'utf8'), 'project version')
})

test('根文件冲突选择全部覆盖时写入包内版本', async t => {
  const { src, dest } = await createConflictFixture(t)
  const stats = await copyFile(src, dest, { conflict: CONFLICT.OVERWRITE })

  assert.deepEqual(stats, { copied: 0, skipped: 0, overwritten: 1 })
  assert.equal(await fs.readFile(dest, 'utf8'), 'package version')
})

test('根文件冲突逐个决定时调用回调并执行选择', async t => {
  const { src, dest } = await createConflictFixture(t)
  let promptedPath
  const stats = await copyFile(src, dest, {
    conflict: CONFLICT.PROMPT,
    onConflict: filePath => {
      promptedPath = filePath
      return CONFLICT_DECISION.OVERWRITE_ONE
    }
  })

  assert.equal(promptedPath, dest)
  assert.deepEqual(stats, { copied: 0, skipped: 0, overwritten: 1 })
  assert.equal(await fs.readFile(dest, 'utf8'), 'package version')
})
