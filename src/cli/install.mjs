// 主流程：选 agent → 选冲突策略 → 展示计划 → 确认 → 复制 → 后置检查。
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AGENTS, AGENT_ORDER } from './agents.mjs'
import { copyDir, CONFLICT, CONFLICT_DECISION } from './copy.mjs'
import { select, confirm, closePrompts } from './prompts.mjs'

const COPY_PLAN = [
  { srcRel: 'skills/execution', destRel: 'skills/execution' },
  { srcRel: 'skills/review', destRel: 'skills/review' },
  { srcRel: 'skills/artifact', destRel: 'skills/artifact' },
  { srcRel: 'tools/lark', destRel: 'tools/lark' },
  { srcRel: 'tools/product-design-specs', destRel: 'tools/product-design-specs' }
]

// 提示消费者：SKILL.md 里引用了根目录 HUMAN_AGENT_WORKFLOW.md，用户仓库根缺这个文件时打印警告。
const HAW_FILENAME = 'HUMAN_AGENT_WORKFLOW.md'

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

async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
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
  const cwd = process.cwd()
  const targetAbs = path.resolve(cwd, agent.targetDir)

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
  console.log(`📂 将复制以下内容到 ${agent.targetDir}：`)
  for (const item of COPY_PLAN) {
    console.log(`  ${item.srcRel}/  →  ${agent.targetDir}${item.destRel}/`)
  }

  const ok = await confirm('? 确认开始？', { defaultYes: false })
  if (!ok) {
    console.log('\n已取消，未做任何改动。')
    return
  }

  const pkgRoot = packageRoot()
  const total = { copied: 0, skipped: 0, overwritten: 0 }
  const state = {}
  for (const item of COPY_PLAN) {
    const src = path.join(pkgRoot, item.srcRel)
    const dest = path.join(targetAbs, item.destRel)
    process.stdout.write(`  ↳ ${item.destRel} ... `)
    const stats = await copyDir(src, dest, {
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

  // 后置检查：目标仓库根是否有 HUMAN_AGENT_WORKFLOW.md
  const hawPath = path.resolve(cwd, HAW_FILENAME)
  const hasHaw = await pathExists(hawPath)
  if (!hasHaw) {
    console.log('')
    console.log(`⚠️  未在仓库根目录发现 ${HAW_FILENAME}`)
    console.log(`   devFlow / prd-review 等子命令依赖它判断 L0/L1/L2/L3 分档`)
    console.log(`   请从 dev-workflow-skill 源仓库获取并放到项目根目录`)
    console.log(`   https://github.com/Wenyari/dev-workflow-skill/blob/main/${HAW_FILENAME}`)
  }

  console.log('')
  console.log(`建议：git add ${agent.targetDir} && git commit -m "chore: install @dev-workflow/skill"`)
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
