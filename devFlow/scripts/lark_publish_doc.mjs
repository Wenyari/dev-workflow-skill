import { readFileSync } from 'node:fs'

import { getTenantAccessToken, larkRequest, parseArgs, printJson, requireEnv } from './lark_api.mjs'
import { markdownToLarkBlocks } from './markdown_to_lark_blocks.mjs'

const WRITE_BATCH_SIZE = 40

function sanitizeBlock(block) {
  return JSON.parse(JSON.stringify(block))
}

function createTextElements(text) {
  const elements = []
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

async function getParentNode(token, parentToken) {
  const payload = await larkRequest(
    `/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(parentToken)}`,
    { token }
  )
  const node = payload.data?.node

  if (!node?.space_id) throw new Error('Wiki parent node not found')
  return node
}

async function createWikiDoc(token, parentNode, title, parentToken) {
  const payload = await larkRequest(`/open-apis/wiki/v2/spaces/${parentNode.space_id}/nodes`, {
    token,
    method: 'POST',
    body: JSON.stringify({
      obj_type: 'docx',
      node_type: 'origin',
      parent_node_token: parentToken,
      title
    })
  })
  const node = payload.data?.node

  if (!node?.obj_token) throw new Error('Create wiki doc failed')
  return node
}

export async function writeBlocks(token, docToken, blocks) {
  let written = 0
  let buffer = []

  async function flushBuffer() {
    if (!buffer.length) return

    const children = buffer.map((block) => sanitizeBlock(block))
    let payload

    try {
      payload = await larkRequest(
        `/open-apis/docx/v1/documents/${docToken}/blocks/${docToken}/children`,
        {
          token,
          method: 'POST',
          body: JSON.stringify({ children })
        }
      )
    } catch {
      for (let index = 0; index < children.length; index += 1) {
        try {
          const singlePayload = await larkRequest(
            `/open-apis/docx/v1/documents/${docToken}/blocks/${docToken}/children`,
            {
              token,
              method: 'POST',
              body: JSON.stringify({ children: [children[index]] })
            }
          )
          written += singlePayload.data?.children?.length || 0
        } catch (singleError) {
          throw new Error(
            `Write block failed at batch index ${index}, block_type ${children[index]?.block_type}: ${singleError.message}`,
            { cause: singleError }
          )
        }
      }

      buffer = []
      return
    }

    written += payload.data?.children?.length || 0
    buffer = []
  }

  async function writeTable(block) {
    await flushBuffer()

    const property = block.table.property
    const values = (block.__tableRows || []).flat()

    // 用 descendant API 一次性建表 + 单元格 + 文本：单元格只含内容文本块（不带自动空块），
    // 行高更紧凑，也比逐格写入快得多。
    const cellIds = values.map((_, index) => `tc${index}`)
    const descendants = [
      {
        block_id: 'tbl',
        block_type: 31,
        table: { property: { row_size: property.row_size, column_size: property.column_size } },
        children: cellIds
      }
    ]
    values.forEach((value, index) => {
      descendants.push({
        block_id: cellIds[index],
        block_type: 32,
        table_cell: {},
        children: [`tx${index}`]
      })
      descendants.push({
        block_id: `tx${index}`,
        block_type: 2,
        text: { elements: createTextElements(value || '') }
      })
    })

    const payload = await larkRequest(
      `/open-apis/docx/v1/documents/${docToken}/blocks/${docToken}/descendant`,
      {
        token,
        method: 'POST',
        body: JSON.stringify({ index: -1, children_id: ['tbl'], descendants })
      }
    )

    written += payload.data?.block_id_relations?.length || 1

    // 表头底色 + 满宽列宽：建表后逐项 PATCH（建表时不接受这些属性）。
    const relation = (payload.data?.block_id_relations || []).find(
      (item) => item.temporary_block_id === 'tbl'
    )
    const tableId = relation?.block_id

    if (tableId) {
      const updatePath = `/open-apis/docx/v1/documents/${docToken}/blocks/${tableId}`
      await larkRequest(updatePath, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ update_table_property: { header_row: true } })
      })

      const widths = block.__columnWidth || []
      for (let index = 0; index < widths.length; index += 1) {
        await larkRequest(updatePath, {
          token,
          method: 'PATCH',
          body: JSON.stringify({
            update_table_property: { column_index: index, column_width: widths[index] }
          })
        })
      }
    }
  }

  async function writeContainerText(blockType, containerKey, containerValue, text) {
    await flushBuffer()

    const payload = await larkRequest(
      `/open-apis/docx/v1/documents/${docToken}/blocks/${docToken}/descendant`,
      {
        token,
        method: 'POST',
        body: JSON.stringify({
          index: -1,
          children_id: ['container'],
          descendants: [
            {
              block_id: 'container',
              block_type: blockType,
              [containerKey]: containerValue,
              children: ['container_text']
            },
            {
              block_id: 'container_text',
              block_type: 2,
              text: { elements: createTextElements(text) }
            }
          ]
        })
      }
    )

    written += payload.data?.descendants?.length || 1
  }

  for (const block of blocks) {
    if (block.__tableRows) {
      await writeTable(block)
      continue
    }

    if (block.block_type === 19) {
      await writeContainerText(19, 'callout', block.callout || {}, block.__calloutText || '')
      continue
    }

    if (block.block_type === 34) {
      await writeContainerText(34, 'quote_container', block.quote_container || {}, block.__quoteText || '')
      continue
    }

    buffer.push(block)

    if (buffer.length >= WRITE_BATCH_SIZE) {
      await flushBuffer()
    }
  }

  await flushBuffer()

  return written
}

async function verifyDoc(token, docToken) {
  const payload = await larkRequest(
    `/open-apis/docx/v1/documents/${docToken}/blocks?page_size=20`,
    {
      token
    }
  )

  return payload.data?.items?.length || 0
}

function inferTitle(markdown, explicitTitle) {
  if (explicitTitle) return explicitTitle

  const heading = /^#\s+(.+)$/m.exec(markdown)
  if (heading) return heading[1].trim()

  return '技术文档'
}

async function main() {
  const args = parseArgs()
  // 应用凭证由后端感知的 getTenantAccessToken 把关（larkcli 用户身份不需要 app secret）；
  // Wiki 父节点是两种后端都需要的目标参数。
  requireEnv(['FEISHU_WIKI_PARENT_NODE_TOKEN'])

  const markdown = args.file ? readFileSync(args.file, 'utf8') : readFileSync(0, 'utf8')
  const title = inferTitle(markdown, args.title)
  const parentToken = args.parent || process.env.FEISHU_WIKI_PARENT_NODE_TOKEN
  const token = await getTenantAccessToken()
  const parentNode = await getParentNode(token, parentToken)
  const node = await createWikiDoc(token, parentNode, title, parentToken)
  const blocks = markdownToLarkBlocks(markdown)
  const written = await writeBlocks(token, node.obj_token, blocks)
  const verifyCount = await verifyDoc(token, node.obj_token)

  printJson({
    ok: true,
    title,
    url: node.url,
    nodeToken: node.node_token,
    docToken: node.obj_token,
    blockCount: written,
    verifyCount
  })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message)
    process.exit(1)
  })
}
