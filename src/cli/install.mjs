// 主流程：选 agent → 展示计划 → 确认 → 复制。
// Step 2：默认「跳过已存在」，冲突策略选择留到 Step 3。
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AGENTS, AGENT_ORDER } from './agents.mjs'
import { copyDir, CONFLICT } from './copy.mjs'
import { select, confirm, closePrompts } from './prompts.mjs'

// 包内要搬到目标仓库的源目录清单（镜像层级）。
// srcRel 相对包根目录；destRel 相对目标仓库根 targetDir。
const COPY_PLAN = [
  { srcRel: 'skills/execution/devFlow', destRel: 'skills/execution/devFlow' },
  { srcRel: 'skills/execution/figmaSync', destRel: 'skills/execution/figmaSync' },
  { srcRel: 'skills/review/consistency-checker', destRel: 'skills/review/consistency-checker' },
  { srcRel: 'skills/artifact', destRel: 'skills/artifact' },
  { srcRel: 'tools/lark', destRel: 'tools/lark' }
]

function packageRoot() {
  // install.mjs 位于 <root>/src/cli/install.mjs
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(here, '..', '..')
}

export async function run() {
  try {
    await runInner()
  } finally {
    closePrompts()
  }
}

async function runInner() {
  console.log('')
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

  console.log('')
  console.log(`📂 将复制以下内容到 ${agent.targetDir}：`)
  for (const item of COPY_PLAN) {
    console.log(`  ${item.srcRel}/  →  ${agent.targetDir}${item.destRel}/`)
  }
  console.log('')
  console.log('  冲突策略：跳过已存在文件（Step 3 会补充覆盖 / 逐个决定）')

  const ok = await confirm('? 确认开始？', { defaultYes: false })
  if (!ok) {
    console.log('\n已取消，未做任何改动。')
    return
  }

  const pkgRoot = packageRoot()
  const total = { copied: 0, skipped: 0, overwritten: 0 }
  for (const item of COPY_PLAN) {
    const src = path.join(pkgRoot, item.srcRel)
    const dest = path.join(targetAbs, item.destRel)
    process.stdout.write(`  ↳ ${item.destRel} ... `)
    const stats = await copyDir(src, dest, { conflict: CONFLICT.SKIP })
    total.copied += stats.copied
    total.skipped += stats.skipped
    total.overwritten += stats.overwritten
    console.log(`copied=${stats.copied}, skipped=${stats.skipped}`)
  }

  console.log('')
  console.log(`✅ 已安装到 ${agent.targetDir}`)
  console.log(`   合计：新增 ${total.copied}，跳过 ${total.skipped}`)
  console.log('')
  console.log(`建议：git add ${agent.targetDir} && git commit -m "chore: install @dev-workflow/skill"`)
}
