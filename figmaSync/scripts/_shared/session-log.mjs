/**
 * Session Log
 *
 * figmaSync 任务期间，每次调用 lookup-var / match-token 都追加一行 JSONL，
 * 供 figma-sync-report.mjs 汇总。session 边界：AI 在任务开始时跑
 * `pnpm figma:report --reset` 清空。
 *
 * 路径：.agent/skills/figmaSync/.session-log.jsonl（git 忽略）
 *
 * 去重契约：
 *   - 把 (script, canonicalInput) 视为同一查询
 *   - hit 优先于 miss：先 miss 后 hit 时，老的 miss 标 superseded；之后再来 miss 直接丢弃
 *   - readSessionLog() 默认过滤掉 superseded 项
 *
 * canonicalInput 规则：
 *   - 大小写折叠、空白剥除
 *   - `Npx` 与 `N` 视为同义（match-token 现接受两种）
 *   - `var(--xxx, fallback)` 取变量名
 */
import fs from 'node:fs'

const LOG_PATH = '.agent/skills/figmaSync/.session-log.jsonl'

function canonicalize(raw) {
  if (raw === undefined || raw === null) return ''
  let s = String(raw).toLowerCase().trim()
  const varMatch = /var\(\s*(--[a-z0-9_-]+)/.exec(s)
  if (varMatch) s = varMatch[1]
  s = s.replace(/(\d+(?:\.\d+)?)px\b/, '$1')
  return s
}

function readAllRaw() {
  if (!fs.existsSync(LOG_PATH)) return []
  return fs
    .readFileSync(LOG_PATH, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

export function appendSessionLog(entry) {
  try {
    const key = `${entry.script}|${canonicalize(entry.input)}`
    const existing = readAllRaw()
    const prev = [...existing]
      .reverse()
      .find((e) => `${e.script}|${canonicalize(e.input)}` === key && !e.superseded)
    // 已有 hit 时，无论新 entry 是 hit 还是 miss 都不再追加
    if (prev?.hit) return
    if (entry.hit && prev && !prev.hit) {
      const rewritten = existing.map((e) => {
        if (`${e.script}|${canonicalize(e.input)}` !== key) return e
        if (e.hit) return e
        return { ...e, superseded: true }
      })
      const lines = rewritten.map((e) => JSON.stringify(e)).join('\n') + '\n'
      fs.writeFileSync(LOG_PATH, lines)
    }
    const enriched = { ts: new Date().toISOString(), ...entry }
    fs.appendFileSync(LOG_PATH, JSON.stringify(enriched) + '\n')
  } catch {
    // 日志写入失败不影响调用方
  }
}

export function readSessionLog() {
  return readAllRaw().filter((e) => !e.superseded)
}

export function resetSessionLog() {
  if (fs.existsSync(LOG_PATH)) fs.unlinkSync(LOG_PATH)
}

export const SESSION_LOG_PATH = LOG_PATH
