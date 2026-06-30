import { readFileSync } from 'node:fs'

import { parseArgs, printJson } from './lark_api.mjs'

const MAX_TEXT_LENGTH = 1800
const MAX_TABLE_CELLS = 45
// 飞书 docx 单次创建表格 row_size 上限为 9，超过返回 1770001 invalid param。
const MAX_TABLE_ROWS = 9
const CODE_LANGUAGE_MAP = {
  javascript: 3,
  js: 3,
  typescript: 3,
  ts: 3,
  json: 19,
  bash: 14,
  sh: 14,
  shell: 14
}

function splitLongText(text) {
  if (text.length <= MAX_TEXT_LENGTH) return [text]

  const chunks = []
  let rest = text

  while (rest.length > MAX_TEXT_LENGTH) {
    let cut = rest.lastIndexOf('\n', MAX_TEXT_LENGTH)
    if (cut < MAX_TEXT_LENGTH * 0.5) cut = rest.lastIndexOf('。', MAX_TEXT_LENGTH)
    if (cut < MAX_TEXT_LENGTH * 0.5) cut = MAX_TEXT_LENGTH

    chunks.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }

  if (rest) chunks.push(rest)
  return chunks
}

function createTextBlock(text) {
  return {
    block_type: 2,
    text: {
      elements: createTextElements(text)
    }
  }
}

function createBulletBlock(text) {
  return {
    block_type: 12,
    bullet: {
      elements: createTextElements(text)
    }
  }
}

function createOrderedBlock(text, sequence) {
  return {
    block_type: 13,
    ordered: {
      elements: createTextElements(text),
      style: {
        sequence: String(sequence)
      }
    }
  }
}

function createCalloutBlock(text, emoji) {
  const block = {
    block_type: 19,
    callout: { background_color: 1, border_color: 1, emoji_id: emoji || 'memo' }
  }
  // 文本作为子块由 writeBlocks 经 descendant API 写入，避免污染 JSON 序列化。
  Object.defineProperty(block, '__calloutText', { value: text })
  return block
}

function createQuoteBlock(text) {
  const block = { block_type: 34, quote_container: {} }
  Object.defineProperty(block, '__quoteText', { value: text })
  return block
}

function createHeadingBlock(level, text) {
  const blockType = level === 1 ? 3 : level === 2 ? 4 : 5
  const key = level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3'

  return {
    block_type: blockType,
    [key]: {
      elements: createTextElements(text)
    }
  }
}

function createTextElements(text) {
  const elements = []
  // 同时识别行内代码 `code` 与粗体 **bold**。
  const pattern = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      elements.push({ text_run: { content: text.slice(lastIndex, match.index) } })
    }

    const token = match[0]
    if (token.startsWith('`')) {
      elements.push({
        text_run: { content: token.slice(1, -1), text_element_style: { inline_code: true } }
      })
    } else {
      elements.push({
        text_run: { content: token.slice(2, -2), text_element_style: { bold: true } }
      })
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    elements.push({ text_run: { content: text.slice(lastIndex) } })
  }

  return elements.length ? elements : [{ text_run: { content: '' } }]
}

function normalizeLanguage(language) {
  const key = language.trim().toLowerCase()
  return CODE_LANGUAGE_MAP[key] || CODE_LANGUAGE_MAP.text
}

function createCodeBlock(language, code) {
  const block = {
    block_type: 14,
    code: {
      elements: [{ text_run: { content: code } }]
    }
  }
  const languageCode = normalizeLanguage(language)

  if (languageCode) {
    block.code.style = { language: languageCode }
  }

  return block
}

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  // 仅按未转义的 | 切分单元格，再把 \| 还原为字面 |（支持单元格内的联合类型如 'A' \| 'B'）。
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

function isTableSeparator(line) {
  const cells = splitTableRow(line)
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function isTableStart(lines, index) {
  return (
    index + 1 < lines.length && lines[index].includes('|') && isTableSeparator(lines[index + 1])
  )
}

function collectTable(lines, startIndex) {
  const rows = [splitTableRow(lines[startIndex])]
  let index = startIndex + 2

  while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
    rows.push(splitTableRow(lines[index]))
    index += 1
  }

  return { rows, nextIndex: index }
}

function createTableBlocks(rows) {
  const columnSize = Math.max(...rows.map((row) => row.length))
  const normalizedRows = rows.map((row) => [
    ...row,
    ...Array.from({ length: columnSize - row.length }, () => '')
  ])
  const maxRows = Math.max(
    2,
    Math.min(MAX_TABLE_ROWS, Math.floor(MAX_TABLE_CELLS / columnSize))
  )
  const tables = []
  const header = normalizedRows[0]
  const bodyRows = normalizedRows.slice(1)
  const chunks = []

  if (normalizedRows.length <= maxRows) {
    chunks.push(normalizedRows)
  } else {
    const bodyChunkSize = Math.max(1, maxRows - 1)

    for (let index = 0; index < bodyRows.length; index += bodyChunkSize) {
      chunks.push([header, ...bodyRows.slice(index, index + bodyChunkSize)])
    }
  }

  for (const chunk of chunks) {
    tables.push(createTableBlock(chunk, columnSize))
  }

  return tables
}

const TABLE_TOTAL_WIDTH = 760
const TABLE_MIN_COL_WIDTH = 56

function displayWidth(text) {
  let width = 0
  for (const ch of String(text)) {
    width += /[一-鿿　-〿＀-￯]/.test(ch) ? 2 : 1
  }
  return width
}

function computeColumnWidths(rows, columnSize) {
  // 满宽自适应：按每列最长内容（中文计 2 宽）分配，归一到 ~760，长枚举名少换行、行更矮。
  const weights = Array.from({ length: columnSize }, (_, col) =>
    Math.max(2, ...rows.map((row) => displayWidth(row[col] ?? '')))
  )
  const sum = weights.reduce((acc, value) => acc + value, 0) || columnSize
  const widths = weights.map((weight) =>
    Math.max(TABLE_MIN_COL_WIDTH, Math.round((TABLE_TOTAL_WIDTH * weight) / sum))
  )
  const diff = TABLE_TOTAL_WIDTH - widths.reduce((acc, value) => acc + value, 0)
  widths[columnSize - 1] = Math.max(TABLE_MIN_COL_WIDTH, widths[columnSize - 1] + diff)
  return widths
}

function createTableBlock(rows, columnSize) {
  const block = {
    block_type: 31,
    table: {
      property: {
        row_size: rows.length,
        column_size: columnSize
      }
    }
  }

  Object.defineProperty(block, '__tableRows', {
    value: rows
  })
  // 表头底色与列宽建表时不被接受，由 writeBlocks 在建表后 PATCH 设置。
  Object.defineProperty(block, '__columnWidth', {
    value: computeColumnWidths(rows, columnSize)
  })

  return block
}

export function markdownToLarkBlocks(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let paragraph = []
  let codeFence = null
  let codeLines = []
  let orderedSequence = 1

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim()
    paragraph = []

    if (!text) return

    for (const chunk of splitLongText(text)) {
      blocks.push(createTextBlock(chunk))
    }
  }

  const flushCode = () => {
    const language = codeFence ? codeFence.replace(/^```/, '').trim() : ''
    const body = codeLines.join('\n')
    codeFence = null
    codeLines = []

    for (const chunk of splitLongText(body)) {
      blocks.push(createCodeBlock(language, chunk))
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (line.startsWith('```')) {
      if (codeFence) {
        flushCode()
      } else {
        flushParagraph()
        codeFence = line
        codeLines = []
      }
      continue
    }

    if (isTableStart(lines, index)) {
      flushParagraph()
      orderedSequence = 1
      const table = collectTable(lines, index)
      blocks.push(...createTableBlocks(table.rows))
      index = table.nextIndex - 1
      continue
    }

    if (codeFence) {
      codeLines.push(line)
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      flushParagraph()
      blocks.push(createHeadingBlock(heading[1].length, heading[2].trim()))
      continue
    }

    // 高亮块 callout：`> [!TIP] 文本` / `> [!NOTE] ...` / `> [!WARNING] ...`。
    const calloutMatch = /^>\s*\[!(\w+)\]\s*(.*)$/.exec(line)
    if (calloutMatch) {
      flushParagraph()
      orderedSequence = 1
      const type = calloutMatch[1].toUpperCase()
      const emoji = type === 'WARNING' || type === 'WARN' ? 'warning' : type === 'TIP' ? 'bulb' : 'memo'
      blocks.push(createCalloutBlock(calloutMatch[2].trim(), emoji))
      continue
    }

    // 引用块：`> 文本` → 飞书 quote_container（引用样式），由 writeBlocks 经 descendant API 写入。
    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flushParagraph()
      orderedSequence = 1
      const text = quote[1].trim()
      if (text) blocks.push(createQuoteBlock(text))
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      orderedSequence = 1
      continue
    }

    // 分割线：独立的 --- / *** / ___（非表格分隔行）→ 飞书 divider 块。
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph()
      orderedSequence = 1
      blocks.push({ block_type: 22, divider: {} })
      continue
    }

    const bullet = /^\s*[-*]\s+(.+)$/.exec(line)
    if (bullet) {
      flushParagraph()
      orderedSequence = 1
      blocks.push(createBulletBlock(bullet[1].trim()))
      continue
    }

    const ordered = /^\s*\d+[.)]\s+(.+)$/.exec(line)
    if (ordered) {
      flushParagraph()
      blocks.push(createOrderedBlock(ordered[1].trim(), orderedSequence))
      orderedSequence += 1
      continue
    }

    orderedSequence = 1
    paragraph.push(line)
  }

  if (codeFence) flushCode()
  flushParagraph()

  return blocks
}

async function main() {
  const args = parseArgs()
  const file = args.file
  const markdown = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8')
  printJson({ blocks: markdownToLarkBlocks(markdown) })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
