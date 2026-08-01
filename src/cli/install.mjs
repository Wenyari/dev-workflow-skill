// 主流程：选 agent → 选冲突策略 → 展示计划 → 确认 → 复制。
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AGENTS, AGENT_ORDER } from './agents.mjs'
import { copyDir, copyFile, CONFLICT, CONFLICT_DECISION } from './copy.mjs'
import { select, confirm, closePrompts } from './prompts.mjs'

export const HAW_FILENAME = 'HUMAN_AGENT_WORKFLOW.md'
export const LEGACY_FIGMA_SKILL_DIR = path.join('skills', 'execution', 'figmaSync')
export const FIGMA_SKILL_DIR = path.join('skills', 'execution', 'figma-sync')

export const COPY_PLAN = [
  { kind: 'dir', target: 'agent', srcRel: 'skills/execution', destRel: 'skills/execution' },
  { kind: 'dir', target: 'agent', srcRel: 'skills/review', destRel: 'skills/review' },
  { kind: 'dir', target: 'agent', srcRel: 'tools/lark', destRel: 'tools/lark' },
  { kind: 'dir', target: 'agent', srcRel: 'tools/product-design-specs', destRel: 'tools/product-design-specs' },
  { kind: 'file', target: 'workspace', srcRel: HAW_FILENAME, destRel: HAW_FILENAME }
]

export const DEV_WORKFLOW_LOGO = `
[38;5;45m██████╗ [38;5;51m███████╗[38;5;87m██╗   ██╗[0m       [38;5;45m██╗    ██╗ [38;5;51m██████╗ [38;5;87m██████╗ [38;5;123m██╗  ██╗[38;5;159m███████╗[38;5;195m██╗      ██████╗ ██╗    ██╗[0m
[38;5;39m██╔══██╗[38;5;45m██╔════╝[38;5;51m██║   ██║[0m       [38;5;39m██║    ██║[38;5;45m██╔═══██╗[38;5;51m██╔══██╗[38;5;87m██║ ██╔╝[38;5;123m██╔════╝[38;5;159m██║     ██╔═══██╗██║    ██║[0m
[38;5;33m██║  ██║[38;5;39m█████╗  [38;5;45m██║   ██║[0m       [38;5;33m██║ █╗ ██║[38;5;39m██║   ██║[38;5;45m██████╔╝[38;5;51m█████╔╝ [38;5;87m█████╗  [38;5;123m██║     ██║   ██║██║ █╗ ██║[0m
[38;5;27m██║  ██║[38;5;33m██╔══╝  [38;5;39m╚██╗ ██╔╝[0m [1;90m█████╗[0m [38;5;27m██║███╗██║[38;5;33m██║   ██║[38;5;39m██╔══██╗[38;5;45m██╔═██╗ [38;5;51m██╔══╝  [38;5;87m██║     ██║   ██║██║███╗██║[0m
[38;5;21m██████╔╝[38;5;27m███████╗[38;5;33m ╚████╔╝ [0m [1;90m╚════╝[0m [38;5;21m╚███╔███╔╝[38;5;27m╚██████╔╝[38;5;33m██║  ██║[38;5;39m██║  ██╗[38;5;45m██║     [38;5;51m███████╗╚██████╔╝╚███╔███╔╝[0m
[38;5;18m╚═════╝ [38;5;21m╚══════╝[38;5;27m  ╚═══╝  [0m       [38;5;18m ╚══╝╚══╝ [38;5;21m ╚═════╝ [38;5;27m╚═╝  ╚═╝[38;5;33m╚═╝  ╚═╝[38;5;39m╚═╝     [38;5;45m╚══════╝ ╚═════╝  ╚══╝╚══╝ [0m
[2;90m  ░▒▓  DEV-WORKFLOW  ·  ENGINEERING SKILLS  ▓▒░[0m`

function packageRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(here, '..', '..')
}

async function entryExists(entryPath) {
  try {
    await fs.lstat(entryPath)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

export async function findWorkspaceRoot(startDir) {
  let current = path.resolve(startDir)
  while (true) {
    if (await entryExists(path.join(current, '.git'))) return current
    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

export async function inspectLegacySkillInstall(targetAbs) {
  const legacyAbs = path.resolve(targetAbs, LEGACY_FIGMA_SKILL_DIR)
  const canonicalAbs = path.resolve(targetAbs, FIGMA_SKILL_DIR)
  const [legacyExists, canonicalExists] = await Promise.all([
    entryExists(legacyAbs),
    entryExists(canonicalAbs)
  ])
  return { legacyAbs, canonicalAbs, legacyExists, canonicalExists }
}

export function buildCopyPlan({ cwd, targetAbs, pkgRoot = packageRoot() }) {
  return COPY_PLAN.map(item => ({
    ...item,
    srcAbs: path.resolve(pkgRoot, item.srcRel),
    destAbs: path.resolve(item.target === 'workspace' ? cwd : targetAbs, item.destRel)
  }))
}

export async function run() {
  try {
    await runInner()
  } finally {
    closePrompts()
  }
}

async function runInner() {
  console.log(DEV_WORKFLOW_LOGO)
  console.log('📦 @dev-workflow/skill installer')

  const launchCwd = process.cwd()
  const detectedRoot = await findWorkspaceRoot(launchCwd)
  const cwd = detectedRoot ?? launchCwd
  if (detectedRoot && detectedRoot !== launchCwd) {
    console.log(`📍 已从当前子目录定位到仓库根目录：${detectedRoot}`)
  } else if (!detectedRoot) {
    const useCurrentDir = await confirm(
      `? 未检测到 Git 仓库，是否仍安装到当前目录 ${launchCwd}？`,
      { defaultYes: false }
    )
    if (!useCurrentDir) {
      console.log('\n已取消，未做任何改动。')
      return
    }
  }

  const agentId = await select(
    '? 目标 agent：',
    AGENT_ORDER.map(id => ({
      value: id,
      label: AGENTS[id].label,
      hint: `→ ${AGENTS[id].targetDir}`
    })),
    { defaultIndex: 0 }
  )
  const agent = AGENTS[agentId]
  const targetAbs = path.resolve(cwd, agent.targetDir)

  const legacy = await inspectLegacySkillInstall(targetAbs)
  if (legacy.legacyExists) {
    console.log('')
    console.log(`⛔ 检测到旧 Skill 目录：${path.relative(cwd, legacy.legacyAbs)}`)
    if (legacy.canonicalExists) {
      console.log(`   新目录也已存在：${path.relative(cwd, legacy.canonicalAbs)}`)
      console.log('   为避免加载两份视觉同步 Skill，安装器不会自动合并或删除目录。')
    } else {
      console.log(`   当前版本已迁移为：${path.relative(cwd, legacy.canonicalAbs)}`)
      console.log('   请先手动迁移或移除旧目录，再重新运行安装器并选择合适的冲突策略。')
    }
    return
  }

  const conflictMode = await select(
    '? 冲突策略（目标文件已存在时）：',
    [
      { value: CONFLICT.SKIP, label: '跳过已存在文件', hint: '（保留目标仓库现有版本）' },
      { value: CONFLICT.OVERWRITE, label: '全部覆盖', hint: '（用包内版本覆盖）' },
      { value: CONFLICT.PROMPT, label: '逐个决定', hint: '（首次冲突时问，可选择本次剩余全部）' }
    ],
    { defaultIndex: 0 }
  )

  console.log('')
  const plan = buildCopyPlan({ cwd, targetAbs })
  console.log('📂 将复制以下内容：')
  for (const item of plan) {
    const suffix = item.kind === 'dir' ? '/' : ''
    console.log(`  ${item.srcRel}${suffix}  →  ${path.relative(cwd, item.destAbs)}${suffix}`)
  }

  const ok = await confirm('? 确认开始？', { defaultYes: false })
  if (!ok) {
    console.log('\n已取消，未做任何改动。')
    return
  }

  const total = { copied: 0, skipped: 0, overwritten: 0 }
  const state = {}
  for (const item of plan) {
    process.stdout.write(`  ↳ ${item.destRel} ... `)
    const copy = item.kind === 'file' ? copyFile : copyDir
    const stats = await copy(item.srcAbs, item.destAbs, {
      conflict: conflictMode,
      state,
      onConflict: filePath => askConflict(filePath)
    })
    total.copied += stats.copied
    total.skipped += stats.skipped
    total.overwritten += stats.overwritten
    console.log(`copied=${stats.copied}, skipped=${stats.skipped}, overwritten=${stats.overwritten}`)
  }

  console.log('')
  console.log(`✅ 已安装到 ${agent.targetDir}`)
  console.log(`   合计：新增 ${total.copied}，跳过 ${total.skipped}，覆盖 ${total.overwritten}`)

  console.log('')
  console.log(`建议：git add ${agent.targetDir} ${HAW_FILENAME} && git commit -m "chore: install @dev-workflow/skill"`)
}

async function askConflict(filePath) {
  console.log('')
  console.log(`⚠️  冲突：${filePath} 已存在`)
  return select(
    '? 处理方式：',
    [
      { value: CONFLICT_DECISION.SKIP_ONE, label: '跳过本文件' },
      { value: CONFLICT_DECISION.OVERWRITE_ONE, label: '覆盖本文件' },
      { value: CONFLICT_DECISION.SKIP_REST, label: '此后剩余冲突全部跳过' },
      { value: CONFLICT_DECISION.OVERWRITE_REST, label: '此后剩余冲突全部覆盖' }
    ],
    { defaultIndex: 2 }
  )
}
