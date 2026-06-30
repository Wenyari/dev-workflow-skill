/**
 * Icon Inventory
 *
 * 扫描仓库中真实存在的 icon 资产源，供 figmaSync plan 做语义匹配。
 *
 * 用法:
 *   node .agent/skills/figmaSync/scripts/icon-inventory.mjs
 *   node .agent/skills/figmaSync/scripts/icon-inventory.mjs --pretty
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const ICON_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.tsx', '.ts'])
const STATIC_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'])
const SEARCH_ROOTS = ['assets', 'icons', 'public', 'src']
const IGNORE_DIRS = new Set([
  '.git',
  '.agent',
  'dist',
  'node_modules',
  'styled-system',
  'coverage',
  '.turbo',
  '.vite'
])

function main() {
  const pretty = process.argv.includes('--pretty')
  const roots = SEARCH_ROOTS.filter((dir) => fs.existsSync(path.join(ROOT, dir)))
  const files = []

  for (const root of roots) {
    walk(path.join(ROOT, root), files)
  }

  const icons = files
    .map((file) => toIconRecord(file))
    .flat()
    .sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path))

  const out = {
    roots,
    count: icons.length,
    icons,
    note:
      icons.length === 0
        ? '仓库未发现可用 icon 源；请用户提供其他 icon 导入方案，或确认不关心 icon。'
        : null
  }

  console.log(JSON.stringify(out, null, pretty ? 2 : 0))
}

function walk(dir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue
      const next = path.join(dir, entry.name)
      if (isIconSearchDir(next)) walk(next, files)
      continue
    }
    if (!entry.isFile()) continue
    const file = path.join(dir, entry.name)
    const ext = path.extname(entry.name).toLowerCase()
    if (!ICON_EXTENSIONS.has(ext)) continue
    if (isInAllowedIconPath(file) || looksLikeIconFile(file)) {
      files.push(file)
    }
  }
}

function isIconSearchDir(absDir) {
  const rel = toPosix(path.relative(ROOT, absDir))
  if (!rel) return true
  const parts = rel.split('/')
  if (parts.some((p) => IGNORE_DIRS.has(p))) return false
  if (parts[0] === 'assets' || parts[0] === 'icons' || parts[0] === 'public') return true
  if (parts[0] === 'src') return true
  return false
}

function isInAllowedIconPath(absFile) {
  const rel = toPosix(path.relative(ROOT, absFile))
  const parts = rel.split('/')
  if (parts[0] === 'assets' || parts[0] === 'icons' || parts[0] === 'public') return true
  return parts[0] === 'src' && (parts.includes('assets') || parts.includes('icons'))
}

function looksLikeIconFile(absFile) {
  const basename = path.basename(absFile, path.extname(absFile))
  return /\bicon\b/i.test(basename) || /(^|[-_])ic([-_]|$)/i.test(basename)
}

function toIconRecord(absFile) {
  const ext = path.extname(absFile).toLowerCase()
  const rel = toPosix(path.relative(ROOT, absFile))
  if (STATIC_EXTENSIONS.has(ext)) {
    const baseName = path.basename(absFile, ext)
    return [
      {
        name: baseName,
        normalizedName: normalizeName(baseName),
        type: ext.slice(1),
        path: rel,
        exportName: null
      }
    ]
  }

  const source = fs.readFileSync(absFile, 'utf-8')
  const exportNames = extractIconExports(source)
  if (exportNames.length === 0) return []
  return exportNames.map((exportName) => ({
    name: exportName,
    normalizedName: normalizeName(exportName),
    type: 'component',
    path: rel,
    exportName
  }))
}

function extractIconExports(source) {
  const names = new Set()
  const patterns = [
    /export\s+(?:const|function)\s+([A-Z][A-Za-z0-9]*Icon|Icon[A-Z][A-Za-z0-9]*)\b/g,
    /export\s*\{\s*([^}]+)\s*\}/g
  ]

  let m
  while ((m = patterns[0].exec(source)) !== null) {
    names.add(m[1])
  }

  while ((m = patterns[1].exec(source)) !== null) {
    for (const raw of m[1].split(',')) {
      const name = raw
        .trim()
        .replace(/\s+as\s+.+$/, '')
        .trim()
      if (/([A-Z][A-Za-z0-9]*Icon|Icon[A-Z][A-Za-z0-9]*)$/.test(name)) names.add(name)
    }
  }

  return [...names]
}

function normalizeName(name) {
  return name
    .replace(/Icon$/i, '')
    .replace(/^Icon/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase()
    .replace(/^-+|-+$/g, '')
}

function toPosix(p) {
  return p.split(path.sep).join('/')
}

main()
