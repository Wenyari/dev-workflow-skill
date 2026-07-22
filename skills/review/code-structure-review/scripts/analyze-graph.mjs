#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CALL_RELATIONS = new Set([
  'call',
  'calls',
  'invoke',
  'invokes',
  'instantiate',
  'instantiates',
  'inherit',
  'inherits',
  'implement',
  'implements',
  'reference',
  'references',
  'use',
  'uses'
])

const IMPORT_RELATIONS = new Set(['import', 'imports', 'require', 'requires', 'depends_on'])
const STRUCTURAL_RELATIONS = new Set(['contains', 'defines', 'declares', 'member_of', 'part_of'])
const FILE_TYPES = new Set(['file', 'module', 'directory', 'package'])
const SYMBOL_TYPES = new Set([
  'function',
  'method',
  'class',
  'component',
  'hook',
  'service',
  'controller',
  'resolver'
])
const MAX_SIMILARITY_PAIRS = 100_000

function asString(value) {
  return value === undefined || value === null ? '' : String(value)
}

function normalizedRelation(edge) {
  return asString(edge.relation ?? edge.relationship ?? edge.type ?? edge.kind ?? edge.label)
    .trim()
    .toLowerCase()
}

function normalizedType(node) {
  return asString(node.type ?? node.kind ?? node.node_type ?? node.file_type).trim().toLowerCase()
}

function endpointId(endpoint) {
  if (typeof endpoint === 'object' && endpoint !== null) {
    return asString(endpoint.id ?? endpoint.key ?? endpoint.label)
  }
  return asString(endpoint)
}

function sourceLocation(node) {
  const file = asString(node.source_file ?? node.file ?? node.path)
  const line = node.line_start ?? node.start_line ?? node.line ?? node.lineno
  if (!file) return null
  return line ? `${file}:${line}` : file
}

function nodeLabel(node) {
  return asString(node.label ?? node.name ?? node.id)
}

function nodeCommunity(node) {
  const value = node.community ?? node.community_id ?? node.cluster
  return value === undefined || value === null ? null : asString(value)
}

function isSymbol(node) {
  const type = normalizedType(node)
  if (SYMBOL_TYPES.has(type)) return true
  if (FILE_TYPES.has(type)) return false
  return Boolean(sourceLocation(node)) && !['concept', 'rationale', 'document', 'image'].includes(type)
}

function isFileNode(node) {
  return FILE_TYPES.has(normalizedType(node))
}

function isEntrypoint(node) {
  const label = nodeLabel(node).toLowerCase()
  const file = asString(node.source_file ?? node.file ?? node.path).toLowerCase()
  const explicit = node.entrypoint ?? node.is_entrypoint ?? node.exported ?? node.public
  if (explicit === true) return true
  if (/^(main|bootstrap|startup|handler|app|index)$/.test(label)) return true
  return /(^|\/)(index|main|bootstrap|entry|route|routes)\.[a-z0-9]+$/.test(file)
}

function normalizeGraph(raw) {
  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : []
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : Array.isArray(raw.links) ? raw.links : []
  const nodes = rawNodes
    .map((node, index) => ({ ...node, id: asString(node.id ?? node.key ?? node.label ?? index) }))
    .filter(node => node.id)
  const nodeIds = new Set(nodes.map(node => node.id))
  const normalizedEdges = rawEdges
    .map((edge, index) => ({
      ...edge,
      id: asString(edge.id ?? index),
      source: endpointId(edge.source ?? edge.from),
      target: endpointId(edge.target ?? edge.to),
      relation: normalizedRelation(edge)
    }))
  const edges = normalizedEdges.filter(
    edge => edge.source && edge.target && nodeIds.has(edge.source) && nodeIds.has(edge.target)
  )
  return {
    nodes,
    edges,
    directed: raw.directed !== false,
    metadata: {
      inputKind: Array.isArray(raw.links) ? 'built-graph' : 'raw-extraction',
      directedDeclared: typeof raw.directed === 'boolean',
      droppedEndpointEdges: normalizedEdges.length - edges.length
    }
  }
}

function buildIndexes(graph) {
  const byId = new Map(graph.nodes.map(node => [node.id, node]))
  const incoming = new Map(graph.nodes.map(node => [node.id, []]))
  const outgoing = new Map(graph.nodes.map(node => [node.id, []]))
  for (const edge of graph.edges) {
    outgoing.get(edge.source)?.push(edge)
    incoming.get(edge.target)?.push(edge)
  }
  return { byId, incoming, outgoing }
}

function evidenceNode(node) {
  return {
    id: node.id,
    label: nodeLabel(node),
    type: normalizedType(node) || 'unknown',
    location: sourceLocation(node),
    community: nodeCommunity(node)
  }
}

function behavioralEdges(edges) {
  return edges.filter(edge => CALL_RELATIONS.has(edge.relation))
}

function detectOrphans(graph, indexes) {
  const candidates = []
  for (const node of graph.nodes.filter(isSymbol)) {
    if (isEntrypoint(node)) continue
    const inbound = behavioralEdges(indexes.incoming.get(node.id) ?? [])
    if (inbound.length > 0) continue
    candidates.push({
      rule: 'orphan-symbol',
      confidence: 0.62,
      title: `疑似无调用方：${nodeLabel(node)}`,
      nodes: [evidenceNode(node)],
      metrics: { inboundBehavioralEdges: 0 },
      reason: '图中没有发现指向该符号的调用、实例化、继承、实现或引用关系。',
      validation: '检查框架注册、动态导入、反射、模板引用和对外导出后，再判断是否可移除。'
    })
  }
  return candidates
}

function detectWrappers(graph, indexes) {
  const candidates = []
  for (const node of graph.nodes.filter(isSymbol)) {
    const outbound = behavioralEdges(indexes.outgoing.get(node.id) ?? [])
    const inbound = behavioralEdges(indexes.incoming.get(node.id) ?? [])
    if (outbound.length !== 1 || inbound.length === 0) continue
    const target = indexes.byId.get(outbound[0].target)
    if (!target) continue
    candidates.push({
      rule: 'single-call-wrapper',
      confidence: 0.48,
      title: `疑似单一转发封装：${nodeLabel(node)}`,
      nodes: [evidenceNode(node), evidenceNode(target)],
      metrics: { inboundBehavioralEdges: inbound.length, outboundBehavioralEdges: 1 },
      reason: `该节点只有一个行为型出边，目标为 ${nodeLabel(target)}。`,
      validation: '读取函数体，确认是否仅转发；鉴权、埋点、参数归一化、错误转换等逻辑均可构成保留理由。'
    })
  }
  return candidates
}

function jaccard(left, right) {
  let common = 0
  for (const value of left) {
    if (right.has(value)) common++
  }
  return { common, score: common / (left.size + right.size - common) }
}

function pairKey(left, right) {
  return left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`
}

function detectSimilarNeighborhoods(graph, indexes) {
  const neighbors = new Map()
  const inverted = new Map()
  for (const node of graph.nodes.filter(isSymbol)) {
    const targets = new Set(
      behavioralEdges(indexes.outgoing.get(node.id) ?? []).map(edge => edge.target)
    )
    if (targets.size < 2) continue
    neighbors.set(node.id, targets)
    for (const target of targets) {
      const owners = inverted.get(target) ?? []
      owners.push(node.id)
      inverted.set(target, owners)
    }
  }

  // 只比较至少共享一个邻居的节点，避免对大型仓库执行全量平方级扫描。
  const pairs = new Set()
  let truncated = false
  similarityPairs: for (const owners of inverted.values()) {
    const capped = owners.slice(0, 200)
    for (let i = 0; i < capped.length; i++) {
      for (let j = i + 1; j < capped.length; j++) {
        pairs.add(pairKey(capped[i], capped[j]))
        if (pairs.size >= MAX_SIMILARITY_PAIRS) {
          truncated = true
          break similarityPairs
        }
      }
    }
  }

  const candidates = []
  for (const key of pairs) {
    const [leftId, rightId] = key.split('\u0000')
    const left = neighbors.get(leftId)
    const right = neighbors.get(rightId)
    if (!left || !right) continue
    const similarity = jaccard(left, right)
    if (similarity.common < 2 || similarity.score < 0.72) continue
    const leftNode = indexes.byId.get(leftId)
    const rightNode = indexes.byId.get(rightId)
    if (!leftNode || !rightNode) continue
    const shared = [...left].filter(id => right.has(id)).map(id => nodeLabel(indexes.byId.get(id) ?? { id }))
    candidates.push({
      rule: 'similar-dependency-neighborhood',
      confidence: Math.min(0.85, 0.5 + similarity.score * 0.35),
      title: `疑似重复职责：${nodeLabel(leftNode)} / ${nodeLabel(rightNode)}`,
      nodes: [evidenceNode(leftNode), evidenceNode(rightNode)],
      metrics: {
        jaccard: Number(similarity.score.toFixed(3)),
        sharedNeighborCount: similarity.common,
        leftNeighborCount: left.size,
        rightNeighborCount: right.size
      },
      sharedNeighbors: shared.slice(0, 20),
      reason: '两个节点的调用、实例化、继承、实现或引用目标高度重合。',
      validation: '比较业务语义、变化原因、参数和副作用；结构相似不等于应该抽象。'
    })
  }
  return { candidates, truncated }
}

function percentile(values, ratio) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))]
}

function detectHubs(graph, indexes) {
  const symbols = graph.nodes.filter(isSymbol)
  const degreeById = new Map()
  for (const node of symbols) {
    const inbound = behavioralEdges(indexes.incoming.get(node.id) ?? []).length
    const outbound = behavioralEdges(indexes.outgoing.get(node.id) ?? []).length
    degreeById.set(node.id, { inbound, outbound, total: inbound + outbound })
  }
  const threshold = Math.max(6, percentile([...degreeById.values()].map(item => item.total), 0.9))
  return symbols
    .filter(node => degreeById.get(node.id).total >= threshold)
    .map(node => ({
      rule: 'high-coupling-hub',
      confidence: 0.7,
      title: `高耦合节点：${nodeLabel(node)}`,
      nodes: [evidenceNode(node)],
      metrics: { ...degreeById.get(node.id), threshold },
      reason: '该节点的行为型连接数处于当前图的高位区间。',
      validation: '结合职责数量和变化原因判断；公共基础能力的高连接数可能合理。'
    }))
}

function detectBoundaryLeaks(graph, indexes) {
  const candidates = []
  for (const node of graph.nodes.filter(isSymbol)) {
    const community = nodeCommunity(node)
    if (community === null) continue
    const outbound = behavioralEdges(indexes.outgoing.get(node.id) ?? [])
    const cross = outbound.filter(edge => {
      const target = indexes.byId.get(edge.target)
      const targetCommunity = target ? nodeCommunity(target) : null
      return targetCommunity !== null && targetCommunity !== community
    })
    if (cross.length < 3 || cross.length / Math.max(1, outbound.length) < 0.6) continue
    candidates.push({
      rule: 'community-boundary-leak',
      confidence: 0.64,
      title: `跨社区依赖密集：${nodeLabel(node)}`,
      nodes: [evidenceNode(node)],
      metrics: {
        outboundBehavioralEdges: outbound.length,
        crossCommunityEdges: cross.length,
        crossCommunityRatio: Number((cross.length / outbound.length).toFixed(3))
      },
      reason: '该节点的大多数行为型出边指向其他社区。',
      validation: '确认社区划分是否符合真实模块边界，再检查是否存在职责放错位置或边界泄漏。'
    })
  }
  return candidates
}

function fileForNode(node) {
  if (isFileNode(node)) return asString(node.path ?? node.source_file ?? node.file ?? node.label ?? node.id)
  return asString(node.source_file ?? node.file ?? node.path)
}

function stronglyConnectedComponents(adjacency) {
  let index = 0
  const stack = []
  const onStack = new Set()
  const indexes = new Map()
  const lowLinks = new Map()
  const components = []

  function visit(node) {
    indexes.set(node, index)
    lowLinks.set(node, index)
    index++
    stack.push(node)
    onStack.add(node)

    for (const next of adjacency.get(node) ?? []) {
      if (!indexes.has(next)) {
        visit(next)
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(next)))
      } else if (onStack.has(next)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indexes.get(next)))
      }
    }

    if (lowLinks.get(node) !== indexes.get(node)) return
    const component = []
    while (stack.length > 0) {
      const current = stack.pop()
      onStack.delete(current)
      component.push(current)
      if (current === node) break
    }
    components.push(component)
  }

  for (const node of adjacency.keys()) {
    if (!indexes.has(node)) visit(node)
  }
  return components
}

function detectImportCycles(graph, indexes) {
  const adjacency = new Map()
  for (const edge of graph.edges.filter(edge => IMPORT_RELATIONS.has(edge.relation))) {
    const sourceNode = indexes.byId.get(edge.source)
    const targetNode = indexes.byId.get(edge.target)
    if (!sourceNode || !targetNode) continue
    const sourceFile = fileForNode(sourceNode)
    const targetFile = fileForNode(targetNode)
    if (!sourceFile || !targetFile || sourceFile === targetFile) continue
    if (!adjacency.has(sourceFile)) adjacency.set(sourceFile, new Set())
    if (!adjacency.has(targetFile)) adjacency.set(targetFile, new Set())
    adjacency.get(sourceFile).add(targetFile)
  }

  return stronglyConnectedComponents(adjacency)
    .filter(component => component.length > 1)
    .map(component => ({
      rule: 'import-cycle',
      confidence: 0.92,
      title: `循环依赖：${component.join(' → ')}`,
      nodes: component.map(file => ({ id: file, label: file, type: 'file', location: file, community: null })),
      metrics: { fileCount: component.length },
      reason: '文件导入图中存在强连通分量。',
      validation: '确认提取到的导入方向和路径解析正确，再判断应移动类型、拆分模块还是引入稳定接口。'
    }))
}

function summarize(graph, candidates) {
  const byRule = {}
  for (const candidate of candidates) {
    byRule[candidate.rule] = (byRule[candidate.rule] ?? 0) + 1
  }
  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    candidateCount: candidates.length,
    byRule
  }
}

function graphHealth(graph) {
  const symbols = graph.nodes.filter(isSymbol)
  const withSourceLocation = symbols.filter(node => Boolean(sourceLocation(node))).length
  const withCommunity = symbols.filter(node => nodeCommunity(node) !== null).length
  return {
    inputKind: graph.metadata.inputKind,
    directed: graph.directed,
    directedDeclared: graph.metadata.directedDeclared,
    droppedEndpointEdges: graph.metadata.droppedEndpointEdges,
    symbolNodeCount: symbols.length,
    missingSourceLocationSymbols: symbols.length - withSourceLocation,
    sourceLocationCoverage: symbols.length === 0 ? 0 : Number((withSourceLocation / symbols.length).toFixed(3)),
    communityCoverage: symbols.length === 0 ? 0 : Number((withCommunity / symbols.length).toFixed(3)),
    relationTypeCount: new Set(graph.edges.map(edge => edge.relation).filter(Boolean)).size
  }
}

export function analyzeGraph(raw, options = {}) {
  const graph = normalizeGraph(raw)
  const indexes = buildIndexes(graph)
  const similarNeighborhoods = detectSimilarNeighborhoods(graph, indexes)
  let candidates = [
    ...detectOrphans(graph, indexes),
    ...detectWrappers(graph, indexes),
    ...similarNeighborhoods.candidates,
    ...detectHubs(graph, indexes),
    ...detectBoundaryLeaks(graph, indexes),
    ...detectImportCycles(graph, indexes)
  ]
  if (options.scope) {
    const scope = asString(options.scope).replace(/^\.\//, '')
    candidates = candidates.filter(candidate =>
      candidate.nodes.some(node => asString(node.location).replace(/^\.\//, '').startsWith(scope))
    )
  }
  candidates.sort((left, right) => right.confidence - left.confidence || left.rule.localeCompare(right.rule))
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: options.source ?? null,
    health: graphHealth(graph),
    warnings: similarNeighborhoods.truncated
      ? [`相似邻居比较达到 ${MAX_SIMILARITY_PAIRS} 对上限，结果可能未覆盖全部组合。`]
      : [],
    summary: summarize(graph, candidates),
    candidates
  }
}

function parseArgs(argv) {
  const args = { input: '', output: '', scope: '' }
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--input') args.input = argv[++index] ?? ''
    else if (arg === '--output') args.output = argv[++index] ?? ''
    else if (arg === '--scope') args.scope = argv[++index] ?? ''
    else if (arg === '--help' || arg === '-h') args.help = true
    else throw new Error(`未知参数：${arg}`)
  }
  return args
}

function printHelp() {
  console.log('用法：node analyze-graph.mjs --input <graph.json> --output <analysis.json> [--scope <path>]')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }
  if (!args.input || !args.output) {
    printHelp()
    process.exitCode = 1
    return
  }
  const inputPath = path.resolve(args.input)
  const outputPath = path.resolve(args.output)
  const raw = JSON.parse(await fs.readFile(inputPath, 'utf8'))
  const analysis = analyzeGraph(raw, { scope: args.scope, source: inputPath })
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`, 'utf8')
  console.log(`已生成 ${outputPath}：${analysis.summary.candidateCount} 个候选项`)
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isDirectRun) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
