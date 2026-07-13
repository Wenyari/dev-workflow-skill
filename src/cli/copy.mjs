// 递归复制目录：镜像仓库层级，逐文件冲突处理。
import fs from 'node:fs/promises'
import path from 'node:path'

export const CONFLICT = {
  SKIP: 'skip',
  OVERWRITE: 'overwrite',
  PROMPT: 'prompt'
}

// 单文件冲突时的处理结果码（供 onConflict 回调返回）
export const CONFLICT_DECISION = {
  SKIP_ONE: 'skip_one',
  OVERWRITE_ONE: 'overwrite_one',
  SKIP_REST: 'skip_rest',
  OVERWRITE_REST: 'overwrite_rest'
}

async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function walkFiles(srcRoot) {
  const out = []
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (entry.isFile()) {
        out.push(path.relative(srcRoot, full))
      }
    }
  }
  await walk(srcRoot)
  return out
}

async function writeFile(from, to) {
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.copyFile(from, to)
}

// 复制单个源目录到目标目录，返回统计。
// state 让「本次全部这样」的决定跨目录延续；调用方在整个安装流程内共享一个 state 对象。
export async function copyDir(srcAbs, destAbs, { conflict = CONFLICT.SKIP, onConflict, state = {} } = {}) {
  const stats = { copied: 0, skipped: 0, overwritten: 0 }
  if (!(await pathExists(srcAbs))) {
    throw new Error(`源目录不存在：${srcAbs}`)
  }
  const files = await walkFiles(srcAbs)
  for (const rel of files) {
    const from = path.join(srcAbs, rel)
    const to = path.join(destAbs, rel)
    const exists = await pathExists(to)
    if (!exists) {
      await writeFile(from, to)
      stats.copied++
      continue
    }
    // 冲突分派
    let mode = conflict
    if (mode === CONFLICT.PROMPT) {
      if (state.restOverride) {
        mode = state.restOverride
      } else {
        const decision = await onConflict(to)
        if (decision === CONFLICT_DECISION.SKIP_REST) {
          state.restOverride = CONFLICT.SKIP
          mode = CONFLICT.SKIP
        } else if (decision === CONFLICT_DECISION.OVERWRITE_REST) {
          state.restOverride = CONFLICT.OVERWRITE
          mode = CONFLICT.OVERWRITE
        } else if (decision === CONFLICT_DECISION.OVERWRITE_ONE) {
          mode = CONFLICT.OVERWRITE
        } else {
          mode = CONFLICT.SKIP
        }
      }
    }
    if (mode === CONFLICT.OVERWRITE) {
      await writeFile(from, to)
      stats.overwritten++
    } else {
      stats.skipped++
    }
  }
  return stats
}
