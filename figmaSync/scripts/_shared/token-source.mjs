/**
 * Token source helpers.
 *
 * 默认 token 源为 theme/dark/*.css。
 */
import fs from 'node:fs'
import path from 'node:path'

const DEFAULT_SOURCE_FILES = ['primitives.css', 'aliases.css']
const PALETTE_PREFIXES = new Set(['green', 'grey', 'purple', 'red', 'yellow'])
const FOUNDATION_PREFIXES = new Set(['fill', 'icon', 'stroke', 'text'])
const BASE_VALUE_PREFIXES = new Set([
  'border',
  'fontheight',
  'fontsize',
  'fontspacing',
  'fontweight',
  'icon',
  'radius',
  'size',
  'spacing'
])

export function loadCurrentTokenRecords({
  themeDir = path.resolve(process.cwd(), 'theme/dark')
} = {}) {
  const loaded = loadCssTokens(themeDir)
  return { source: 'css', order: loaded.order, records: flattenCssTokenRecords(loaded) }
}

export function buildTokenPathSets(records) {
  return {
    fullPaths: new Set(records.map((r) => `${r.setName}.${r.pathStr}`)),
    shortPaths: new Set(records.map((r) => r.pathStr))
  }
}

function loadCssTokens(tokensSrcDir, sourceFiles = DEFAULT_SOURCE_FILES) {
  const dir = tokensSrcDir ?? path.resolve(process.cwd(), 'theme/dark')
  if (!fs.existsSync(dir)) {
    throw new Error(`theme directory not found: ${dir}`)
  }

  const variables = []
  for (const fileName of sourceFiles) {
    const filePath = path.join(dir, fileName)
    if (!fs.existsSync(filePath)) {
      throw new Error(`token css source missing: ${filePath}`)
    }
    variables.push(...parseCssVariables(fs.readFileSync(filePath, 'utf-8'), fileName))
  }

  return {
    order: ['palette', 'foundation', 'baseValue'],
    variables,
    raw: { dir, sourceFiles }
  }
}

function flattenCssTokenRecords(loaded) {
  const records = []
  for (const variable of loaded.variables) {
    const record = variableToRecord(variable)
    if (record) records.push(record)
  }
  return records
}

function parseCssVariables(cssText, sourceFile) {
  const variables = []
  const declRe = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g
  let match
  while ((match = declRe.exec(stripComments(cssText)))) {
    variables.push({
      name: `--${match[1]}`,
      value: match[2].trim(),
      sourceFile
    })
  }
  return variables
}

function stripComments(cssText) {
  return cssText.replace(/\/\*[\s\S]*?\*\//g, '')
}

function variableToRecord(variable) {
  const segments = variable.name.slice(2).split('-')
  const [first] = segments

  let setName = null
  let type = inferType(variable.value)

  if (PALETTE_PREFIXES.has(first)) {
    setName = 'palette'
  } else if (FOUNDATION_PREFIXES.has(first)) {
    setName = 'foundation'
    type = 'color'
  } else if (BASE_VALUE_PREFIXES.has(first)) {
    setName = 'baseValue'
    type = 'number'
  }

  if (!setName) return null

  return {
    setName,
    path: segments,
    pathStr: segments.join('.'),
    $type: type,
    $value: normalizeRecordValue(variable.value),
    cssValue: normalizeCssValue(variable.value),
    cssVar: variable.name,
    sourceFile: variable.sourceFile
  }
}

function inferType(value) {
  if (
    /^#|^rgb\(|^hsl\(|^var\(--(?:green|grey|purple|red|yellow|fill|icon|stroke|text)-/i.test(value)
  ) {
    return 'color'
  }
  return 'number'
}

function normalizeCssValue(value) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeRecordValue(value) {
  const normalized = normalizeCssValue(value)
  const varRef = parseVarRef(normalized)
  if (!varRef) return normalized
  return `{${cssVarToPath(varRef)}}`
}

function cssVarToPath(cssVar) {
  return cssVar.slice(2).split('-').join('.')
}

function parseVarRef(value) {
  const match = value.match(/^var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,[^)]*)?\)$/)
  return match ? match[1] : null
}
