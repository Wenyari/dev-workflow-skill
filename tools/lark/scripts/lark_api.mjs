import { spawn } from 'node:child_process'

const FEISHU_API_BASE = 'https://open.feishu.cn'
const RATE_LIMIT_CODE = 99991400
const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000]
const LARKCLI_BIN = process.env.FEISHU_LARKCLI_BIN || 'lark-cli'

// 后端选择：openapi（默认，应用身份 + Open API）| larkcli（lark-cli，用户身份）| auto。
let cachedBackend = null

function larkcliIdentity() {
  return process.env.FEISHU_LARKCLI_AS || 'user'
}

// 把 lark-cli 调用包成 Promise；body 经 stdin（--data -）传入，避免大 JSON 的参数长度/转义问题。
function runLarkcli(args, bodyString = null) {
  return new Promise((resolve) => {
    let child
    try {
      child = spawn(LARKCLI_BIN, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    } catch (error) {
      resolve({ exitCode: -1, stdout: '', stderr: error.message })
      return
    }

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (error) => {
      resolve({ exitCode: -1, stdout: '', stderr: error.message })
    })
    child.on('close', (code) => {
      resolve({ exitCode: code, stdout, stderr })
    })

    if (bodyString != null) child.stdin.write(bodyString)
    child.stdin.end()
  })
}

async function larkcliReady() {
  const { exitCode, stdout } = await runLarkcli(['auth', 'status'])
  if (exitCode !== 0) return false

  try {
    const status = JSON.parse(stdout)
    const identity = status.identities?.[larkcliIdentity()]
    return Boolean(identity && (identity.status === 'ready' || identity.available))
  } catch {
    return false
  }
}

export async function getBackend() {
  if (cachedBackend) return cachedBackend

  const raw = (process.env.FEISHU_BACKEND || 'openapi').toLowerCase()

  if (raw === 'openapi' || raw === 'larkcli') {
    cachedBackend = raw
    return raw
  }

  if (raw !== 'auto') {
    throw new Error(`Unknown FEISHU_BACKEND: ${raw} (expected openapi | larkcli | auto)`)
  }

  if (await larkcliReady()) {
    cachedBackend = 'larkcli'
    return cachedBackend
  }

  if (process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET) {
    cachedBackend = 'openapi'
    return cachedBackend
  }

  throw new Error(
    'FEISHU_BACKEND=auto 无可用后端：lark-cli 未登录，且缺少 FEISHU_APP_ID/FEISHU_APP_SECRET'
  )
}

// 拆 path 的 ?query —— lark-cli api 会丢弃 path 内的 query，必须改用 --params 传。
export function splitPathQuery(path) {
  const index = path.indexOf('?')
  if (index === -1) return { path, params: null }

  const params = {}
  for (const pair of path.slice(index + 1).split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    const key = decodeURIComponent(eq === -1 ? pair : pair.slice(0, eq))
    const value = eq === -1 ? '' : decodeURIComponent(pair.slice(eq + 1))
    params[key] = value
  }

  return { path: path.slice(0, index), params }
}

export function buildLarkcliArgs(method, path, { as, hasBody }) {
  const upper = method.toUpperCase()
  const { path: cleanPath, params } = splitPathQuery(path)
  const args = ['api', upper, cleanPath, '--format', 'json', '--as', as]

  if (params) args.push('--params', JSON.stringify(params))
  if (hasBody) args.push('--data', '-')
  // 注：lark-cli 的 raw `api` 命令不接受 --yes（那是 typed 域命令的高危写确认标志）；
  // raw api 的写操作不需要也不识别 --yes。

  return args
}

export function parseLarkcliSuccess(stdout) {
  const json = JSON.parse(stdout)
  return { code: 0, data: json.data }
}

export function parseLarkcliError(stderr, exitCode) {
  try {
    const json = JSON.parse(stderr)
    const error = json.error || {}
    return {
      code: error.code ?? -1,
      message: error.message || 'lark-cli error',
      logId: error.log_id
    }
  } catch {
    return { code: -1, message: (stderr || `lark-cli exit ${exitCode}`).trim() }
  }
}

async function larkcliRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const body = options.body
  const retryDelays = options.retryDelays || DEFAULT_RETRY_DELAYS
  const args = buildLarkcliArgs(method, path, { as: larkcliIdentity(), hasBody: body != null })

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    const { exitCode, stdout, stderr } = await runLarkcli(args, body ?? null)

    if (exitCode === 0) {
      try {
        return parseLarkcliSuccess(stdout)
      } catch {
        throw new Error(`${path} larkcli: 无法解析输出 ${stdout.slice(0, 200)}`)
      }
    }

    const error = parseLarkcliError(stderr, exitCode)

    if (error.code === RATE_LIMIT_CODE && attempt < retryDelays.length) {
      await delay(retryDelays[attempt])
      continue
    }

    throw new Error(`${path} ${error.code} ${error.message}`)
  }
}

export function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name])
  if (missing.length > 0) {
    throw new Error(`Missing env: ${missing.join(', ')}`)
  }
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]

    if (!item.startsWith('--')) continue

    const key = item.slice(2)
    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }

    args[key] = next
    index += 1
  }

  return args
}

export async function getTenantAccessToken() {
  if ((await getBackend()) === 'larkcli') {
    if (!(await larkcliReady())) {
      throw new Error('FEISHU_BACKEND=larkcli：lark-cli 未登录，请运行 lark-cli auth login')
    }
    // larkcli 模式由 lark-cli 管理鉴权，无应用 token；返回哨兵，larkRequest 会忽略它。
    return null
  }

  requireEnv(['FEISHU_APP_ID', 'FEISHU_APP_SECRET'])

  const response = await fetch(
    `${FEISHU_API_BASE}/open-apis/auth/v3/tenant_access_token/internal`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        app_id: process.env.FEISHU_APP_ID,
        app_secret: process.env.FEISHU_APP_SECRET
      })
    }
  )
  const payload = await response.json()

  if (payload.code !== 0) {
    throw new Error(`auth ${payload.code} ${payload.msg}`)
  }

  return payload.tenant_access_token
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function larkRequest(path, options = {}) {
  if ((await getBackend()) === 'larkcli') {
    return larkcliRequest(path, options)
  }

  const token = options.token || (await getTenantAccessToken())
  const retryDelays = options.retryDelays || DEFAULT_RETRY_DELAYS
  const requestOptions = { ...options }
  delete requestOptions.token
  delete requestOptions.retryDelays

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    const response = await fetch(`${FEISHU_API_BASE}${path}`, {
      ...requestOptions,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(options.headers || {})
      }
    })
    const text = await response.text()
    let payload

    try {
      payload = JSON.parse(text)
    } catch {
      payload = { raw: text }
    }

    if (payload.code === 0) {
      return payload
    }

    if (payload.code === RATE_LIMIT_CODE && attempt < retryDelays.length) {
      await delay(retryDelays[attempt])
      continue
    }

    const detail = payload.error ? ` ${JSON.stringify(payload.error)}` : ''
    throw new Error(`${path} ${payload.code} ${payload.msg}${detail}`)
  }
}

export function extractFeishuToken(input) {
  if (!input) return null

  try {
    const url = new URL(input)
    const parts = url.pathname.split('/').filter(Boolean)
    const type = parts[0]
    const token = parts[1]

    if (['wiki', 'docx', 'docs'].includes(type) && token) {
      return { type, token, url: input }
    }
  } catch {
    // Treat plain strings as tokens.
  }

  return { type: 'token', token: input, url: input }
}

export async function resolveDocument(input, token) {
  const parsed = extractFeishuToken(input)

  if (!parsed) {
    throw new Error('Missing Feishu document url or token')
  }

  if (parsed.type === 'wiki') {
    const nodePayload = await larkRequest(
      `/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(parsed.token)}`,
      { token }
    )
    const node = nodePayload.data?.node

    if (!node) throw new Error('Wiki node not found')
    if (node.obj_type !== 'docx') {
      throw new Error(`Unsupported wiki object type: ${node.obj_type}`)
    }

    return {
      inputType: 'wiki',
      title: node.title,
      docToken: node.obj_token,
      nodeToken: node.node_token,
      spaceId: node.space_id,
      url: node.url || parsed.url
    }
  }

  if (parsed.type === 'docx' || parsed.type === 'token') {
    return {
      inputType: 'docx',
      docToken: parsed.token,
      url: parsed.url
    }
  }

  throw new Error(`Unsupported Feishu link type: ${parsed.type}`)
}

export function textFromElements(elements = []) {
  return elements
    .map((element) => {
      if (element.text_run) return element.text_run.content || ''
      if (element.mention_user) return element.mention_user.name || '@用户'
      if (element.docs_link) return element.docs_link.url || element.docs_link.title || ''
      if (element.file) return element.file.name || ''
      if (element.equation) return element.equation.content || ''
      if (element.reminder) return element.reminder.text || ''
      return ''
    })
    .join('')
}

// 把飞书 text_run 的 text_element_style 按固定嵌套顺序 link > strikethrough > bold > italic > inline_code
// 包装成 Markdown。inline_code 必须在最内层：Markdown 反引号内的内容不会被解析，
// 若把 `~~x~~` 反过来包就渲染成字面横线而不是删除线。
// 下划线和颜色忽略（Markdown 无原生语义）。
function wrapRichText(content, style = {}) {
  if (!content) return ''

  const trimmed = content.trim()
  if (!trimmed) return content

  const leading = content.slice(0, content.length - content.trimStart().length)
  const trailing = content.slice(content.trimEnd().length)
  let inner = trimmed

  if (style.inline_code) inner = `\`${inner}\``
  if (style.italic) inner = `*${inner}*`
  if (style.bold) inner = `**${inner}**`
  if (style.strikethrough) inner = `~~${inner}~~`
  if (style.link?.url) {
    let url = style.link.url
    try {
      url = decodeURIComponent(url)
    } catch {
      // 保留原样
    }
    inner = `[${inner}](${url})`
  }

  return `${leading}${inner}${trailing}`
}

export function richTextFromElements(elements = []) {
  return elements
    .map((element) => {
      if (element.text_run) {
        return wrapRichText(element.text_run.content || '', element.text_run.text_element_style)
      }
      if (element.mention_user) return element.mention_user.name || '@用户'
      if (element.docs_link) {
        const url = element.docs_link.url || ''
        const title = element.docs_link.title || url
        return url ? `[${title}](${url})` : title
      }
      if (element.file) return element.file.name || ''
      if (element.equation) {
        const content = element.equation.content || ''
        return content ? `$${content}$` : ''
      }
      if (element.reminder) return element.reminder.text || ''
      return ''
    })
    .join('')
}

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}
