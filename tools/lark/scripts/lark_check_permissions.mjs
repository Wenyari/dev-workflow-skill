import {
  getTenantAccessToken,
  larkRequest,
  parseArgs,
  printJson,
  requireEnv,
  resolveDocument
} from './lark_api.mjs'

async function main() {
  const args = parseArgs()
  const token = await getTenantAccessToken()
  const checks = []

  if (args.url) {
    const document = await resolveDocument(args.url, token)
    checks.push({
      name: 'resolve-document',
      ok: true,
      title: document.title,
      inputType: document.inputType,
      docToken: document.docToken,
      nodeToken: document.nodeToken
    })
  }

  if (args.parent || process.env.FEISHU_WIKI_PARENT_NODE_TOKEN) {
    requireEnv(['FEISHU_WIKI_PARENT_NODE_TOKEN'])
    const parent = args.parent || process.env.FEISHU_WIKI_PARENT_NODE_TOKEN
    const payload = await larkRequest(
      `/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(parent)}`,
      { token }
    )
    const node = payload.data?.node

    checks.push({
      name: 'wiki-parent-read',
      ok: true,
      title: node?.title,
      spaceId: node?.space_id,
      nodeToken: node?.node_token,
      objType: node?.obj_type
    })
  }

  printJson({ ok: true, checks })
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
