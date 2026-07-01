import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  getTenantAccessToken,
  larkRequest,
  parseArgs,
  printJson,
  resolveDocument,
  richTextFromElements,
  textFromElements
} from './lark_api.mjs'

const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_DIR = path.join(os.tmpdir(), 'devFlow-lark-cache')

function headingLevel(block) {
  for (let level = 1; level <= 6; level += 1) {
    if (block[`heading${level}`]) return level
  }
  return 0
}

function blockText(block, { rich = false } = {}) {
  const render = rich ? richTextFromElements : textFromElements

  for (const key of [
    'page',
    'text',
    'heading1',
    'heading2',
    'heading3',
    'heading4',
    'heading5',
    'heading6',
    'bullet',
    'ordered',
    'todo',
    'code',
    'quote'
  ]) {
    if (block[key]) return render(block[key].elements || [])
  }

  return ''
}

function blockPlainText(block) {
  return blockText(block, { rich: false })
}

function blockRichText(block) {
  return blockText(block, { rich: true })
}

function createRenderer(items) {
  const byId = new Map(items.map((block) => [block.block_id, block]))

  function renderTable(block) {
    const cells = block.table?.cells || []
    const cols = block.table?.property?.column_size || 1
    const rows = []

    for (let index = 0; index < cells.length; index += cols) {
      rows.push(cells.slice(index, index + cols).map((cellId) => renderCell(cellId)))
    }

    if (!rows.length) return '[表格]'

    return rows.map((row) => row.join(' | ')).join('\n')
  }

  function renderCell(cellId) {
    const cell = byId.get(cellId)
    if (!cell) return ''

    return (cell.children || [])
      .map((childId) => renderBlock(childId))
      .filter(Boolean)
      .join('; ')
      .replace(/\n+/g, '; ')
  }

  function renderBlock(blockId) {
    const block = byId.get(blockId)
    if (!block) return ''

    if (block.table) return renderTable(block)
    if (block.table_cell || block.grid || block.grid_column || block.callout) {
      return (block.children || [])
        .map((childId) => renderBlock(childId))
        .filter(Boolean)
        .join('\n')
    }

    const level = headingLevel(block)
    const text = blockRichText(block)
    let line

    if (level) line = `${'#'.repeat(level)} ${text}`
    else if (block.bullet) line = `- ${text}`
    else if (block.ordered) line = `1. ${text}`
    else if (block.todo) line = `- [ ] ${text}`
    else if (block.quote) line = `> ${text}`
    else if (block.image) line = '[图片]'
    else line = text

    const children = (block.children || [])
      .map((childId) => renderBlock(childId))
      .filter(Boolean)
      .join('\n')

    return [line, children].filter(Boolean).join('\n')
  }

  function renderBlockLine(blockId) {
    const block = byId.get(blockId)
    if (!block) return ''

    if (block.table) return renderTable(block)
    if (block.table_cell || block.grid || block.grid_column || block.callout) return ''

    const level = headingLevel(block)
    const text = blockRichText(block)

    if (level) return `${'#'.repeat(level)} ${text}`
    if (block.bullet) return `- ${text}`
    if (block.ordered) return `1. ${text}`
    if (block.todo) return `- [ ] ${text}`
    if (block.quote) return `> ${text}`
    if (block.image) return '[图片]'
    return text
  }

  return { byId, renderBlock, renderBlockLine }
}

async function readAllBlocks(docToken, token) {
  let pageToken = ''
  const items = []

  do {
    const payload = await larkRequest(
      `/open-apis/docx/v1/documents/${docToken}/blocks?page_size=500${
        pageToken ? `&page_token=${encodeURIComponent(pageToken)}` : ''
      }`,
      { token }
    )

    items.push(...(payload.data?.items || []))
    pageToken = payload.data?.page_token || ''
  } while (pageToken)

  return items
}

function getCachePath(docToken) {
  return path.join(CACHE_DIR, `${encodeURIComponent(docToken)}.json`)
}

function readCache(docToken) {
  const cachePath = getCachePath(docToken)

  if (!fs.existsSync(cachePath)) return null

  try {
    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'))
    if (Date.now() - cache.createdAt > CACHE_TTL_MS) return null
    return cache
  } catch {
    return null
  }
}

function writeCache(docToken, cache) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(getCachePath(docToken), JSON.stringify(cache))
}

function parseSections(args) {
  if (args.sections) {
    return String(args.sections)
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (args.section) return [String(args.section)]
  return []
}

function findSection(blocks, section, expectedLevel) {
  const exactMatches = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => {
      const levelMatches = expectedLevel ? block.level === expectedLevel : block.level > 0
      return levelMatches && block.text.trim() === section
    })

  if (exactMatches.length === 1) return { match: exactMatches[0], candidates: [] }

  const fallbackMatches = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.level > 0 && block.text.trim() === section)

  if (fallbackMatches.length === 1) return { match: fallbackMatches[0], candidates: [] }

  const candidates = (fallbackMatches.length ? fallbackMatches : exactMatches).map(({ block }) => ({
    level: block.level,
    text: block.text
  }))

  return { match: null, candidates }
}

function extractSection(blocks, section, expectedLevel) {
  const { match, candidates } = findSection(blocks, section, expectedLevel)

  if (!match) {
    return {
      heading: section,
      found: false,
      candidates,
      markdown: ''
    }
  }

  const startIndex = match.index
  const startLevel = blocks[startIndex].level || 1
  let endIndex = blocks.length

  for (let index = startIndex + 1; index < blocks.length; index += 1) {
    if (blocks[index].level > 0 && blocks[index].level <= startLevel) {
      endIndex = index
      break
    }
  }

  return {
    heading: blocks[startIndex].text,
    level: blocks[startIndex].level,
    found: true,
    markdown: blocks
      .slice(startIndex, endIndex)
      .map((block) => block.markdown)
      .join('\n\n')
  }
}

async function main() {
  const args = parseArgs()
  const input = args.url || args.token

  if (!input)
    throw new Error(
      'Usage: node lark_read_docx.mjs --url <feishu-url> [--section name] [--level 3]'
    )

  const token = await getTenantAccessToken()
  const document = await resolveDocument(input, token)
  const cached = args['no-cache'] ? null : readCache(document.docToken)
  const meta =
    cached?.meta ||
    (await larkRequest(`/open-apis/docx/v1/documents/${document.docToken}`, { token }))
  const items = cached?.items || (await readAllBlocks(document.docToken, token))
  const { byId, renderBlockLine } = createRenderer(items)

  if (!cached && !args['no-cache']) {
    writeCache(document.docToken, {
      createdAt: Date.now(),
      meta,
      items
    })
  }

  const root = items[0]
  const blocks = []

  function flatten(blockId) {
    const block = byId.get(blockId)
    if (!block) return

    const rendered = renderBlockLine(blockId)
    if (rendered) {
      blocks.push({
        id: blockId,
        level: headingLevel(block),
        text: blockPlainText(block).trim(),
        markdown: rendered
      })
    }

    if (!block.table) {
      for (const childId of block.children || []) flatten(childId)
    }
  }

  for (const childId of root?.children || []) flatten(childId)

  const headings = blocks
    .filter((block) => block.level > 0)
    .map(({ level, text }) => ({ level, text }))

  const expectedLevel = args.level ? Number(args.level) : null
  const requestedSections = parseSections(args)
  const sections = requestedSections.map((section) =>
    extractSection(blocks, section, expectedLevel)
  )
  const sectionMarkdown = sections.length === 1 ? sections[0].markdown : ''

  printJson({
    title: meta.data?.document?.title || document.title,
    docToken: document.docToken,
    nodeToken: document.nodeToken,
    type: document.inputType,
    blockCount: items.length,
    cacheHit: Boolean(cached),
    headings,
    sections,
    sectionMarkdown
  })
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
