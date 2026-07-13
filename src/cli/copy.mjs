// 递归复制目录：镜像仓库层级，逐文件冲突处理。
// 冲突策略（Step 2 只实现 skip；Step 3 补 overwrite / prompt）。
import fs from 'node:fs/promises'
import path from 'node:path'

export const CONFLICT = {
  SKIP: 'skip',
  OVERWRITE: 'overwrite',
  PROMPT: 'prompt'
}

async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

// 递归收集 srcRoot 下的所有文件（返回相对路径列表）。
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

// 复制单个源目录到目标目录，返回统计。
// srcAbs: 源目录绝对路径
// destAbs: 目标目录绝对路径（镜像后的位置）
export async function copyDir(srcAbs, destAbs, { conflict = CONFLICT.SKIP } = {}) {
  const stats = { copied: 0, skipped: 0, overwritten: 0 }
  if (!(await pathExists(srcAbs))) {
    throw new Error(`源目录不存在：${srcAbs}`)
  }
  const files = await walkFiles(srcAbs)
  for (const rel of files) {
    const from = path.join(srcAbs, rel)
    const to = path.join(destAbs, rel)
    const exists = await pathExists(to)
    if (exists) {
      if (conflict === CONFLICT.SKIP) {
        stats.skipped++
        continue
      }
      if (conflict === CONFLICT.OVERWRITE) {
        await fs.mkdir(path.dirname(to), { recursive: true })
        await fs.copyFile(from, to)
        stats.overwritten++
        continue
      }
      // PROMPT 交由 Step 3 补
      stats.skipped++
      continue
    }
    await fs.mkdir(path.dirname(to), { recursive: true })
    await fs.copyFile(from, to)
    stats.copied++
  }
  return stats
}
