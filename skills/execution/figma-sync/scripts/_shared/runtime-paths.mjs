import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SHARED_DIR = path.dirname(fileURLToPath(import.meta.url))

export const SKILL_ROOT = path.resolve(SHARED_DIR, '..', '..')

export function getWorkspaceKey(cwd = process.cwd()) {
  return createHash('sha256').update(path.resolve(cwd)).digest('hex').slice(0, 16)
}

export function resolveSessionDir({ cwd = process.cwd(), tempDir = os.tmpdir() } = {}) {
  return path.join(tempDir, 'dev-workflow-skill', 'figma-sync', getWorkspaceKey(cwd))
}

export function resolveSessionLogPath(options = {}) {
  return path.join(resolveSessionDir(options), 'session-log.jsonl')
}

export function resolveSessionReportDir(options = {}) {
  return resolveSessionDir(options)
}
