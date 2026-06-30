const FEISHU_API_BASE = 'https://open.feishu.cn'
const RATE_LIMIT_CODE = 99991400
const DEFAULT_RETRY_DELAYS = [1000, 2000, 4000]

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

export function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}
