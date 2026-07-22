import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyzeGraph } from './analyze-graph.mjs'

function node(id, type = 'function', extra = {}) {
  return { id, label: id, type, source_file: `src/${id}.ts`, line_start: 1, ...extra }
}

function edge(source, target, relation = 'calls') {
  return { source, target, relation }
}

test('兼容 NetworkX links 并识别孤立符号', () => {
  const result = analyzeGraph({
    directed: true,
    nodes: [node('used'), node('caller'), node('unused')],
    links: [edge('caller', 'used')]
  })
  const orphanIds = result.candidates
    .filter(item => item.rule === 'orphan-symbol')
    .flatMap(item => item.nodes.map(itemNode => itemNode.id))
  assert.ok(orphanIds.includes('unused'))
  assert.ok(!orphanIds.includes('used'))
})

test('入口节点不会被识别为孤立符号', () => {
  const result = analyzeGraph({ nodes: [node('main'), node('exportedFn', 'function', { exported: true })], edges: [] })
  assert.equal(result.candidates.filter(item => item.rule === 'orphan-symbol').length, 0)
})

test('识别单一调用转发候选', () => {
  const result = analyzeGraph({
    nodes: [node('caller'), node('wrapper'), node('target')],
    edges: [edge('caller', 'wrapper'), edge('wrapper', 'target')]
  })
  const wrapper = result.candidates.find(item => item.rule === 'single-call-wrapper')
  assert.equal(wrapper.nodes[0].id, 'wrapper')
  assert.equal(wrapper.nodes[1].id, 'target')
})

test('通过邻居 Jaccard 相似度识别重复职责候选', () => {
  const nodes = ['left', 'right', 'depA', 'depB', 'depC'].map(id => node(id))
  const result = analyzeGraph({
    nodes,
    edges: [
      edge('left', 'depA'),
      edge('left', 'depB'),
      edge('left', 'depC'),
      edge('right', 'depA'),
      edge('right', 'depB'),
      edge('right', 'depC')
    ]
  })
  const duplicate = result.candidates.find(item => item.rule === 'similar-dependency-neighborhood')
  assert.equal(duplicate.metrics.jaccard, 1)
  assert.deepEqual(duplicate.nodes.map(item => item.id), ['left', 'right'])
})

test('识别文件级循环导入', () => {
  const result = analyzeGraph({
    nodes: [
      { id: 'fileA', label: 'src/a.ts', type: 'file', path: 'src/a.ts' },
      { id: 'fileB', label: 'src/b.ts', type: 'file', path: 'src/b.ts' }
    ],
    edges: [edge('fileA', 'fileB', 'imports'), edge('fileB', 'fileA', 'imports')]
  })
  const cycle = result.candidates.find(item => item.rule === 'import-cycle')
  assert.equal(cycle.metrics.fileCount, 2)
  assert.deepEqual(new Set(cycle.nodes.map(item => item.location)), new Set(['src/a.ts', 'src/b.ts']))
})

test('识别跨社区依赖密集节点', () => {
  const result = analyzeGraph({
    nodes: [
      node('gateway', 'function', { community: 1 }),
      node('a', 'function', { community: 2 }),
      node('b', 'function', { community: 2 }),
      node('c', 'function', { community: 3 }),
      node('local', 'function', { community: 1 })
    ],
    edges: [edge('gateway', 'a'), edge('gateway', 'b'), edge('gateway', 'c'), edge('gateway', 'local')]
  })
  const leak = result.candidates.find(item => item.rule === 'community-boundary-leak')
  assert.equal(leak.nodes[0].id, 'gateway')
  assert.equal(leak.metrics.crossCommunityEdges, 3)
})

test('识别高连接节点并支持 scope 过滤', () => {
  const nodes = [node('hub'), ...Array.from({ length: 7 }, (_, index) => node(`n${index}`))]
  const result = analyzeGraph(
    { nodes, edges: nodes.slice(1).map(item => edge('hub', item.id)) },
    { scope: 'src/hub.ts' }
  )
  assert.ok(result.candidates.some(item => item.rule === 'high-coupling-hub'))
  assert.ok(result.candidates.every(item => item.nodes.some(itemNode => itemNode.location?.startsWith('src/hub.ts'))))
})

test('空图返回稳定结果', () => {
  const result = analyzeGraph({})
  assert.deepEqual(result.summary, { nodeCount: 0, edgeCount: 0, candidateCount: 0, byRule: {} })
  assert.deepEqual(result.candidates, [])
})

test('报告缺失端点、源码位置和社区覆盖率', () => {
  const result = analyzeGraph({
    directed: true,
    nodes: [node('located', 'function', { community: 1 }), { id: 'missing', type: 'function' }],
    edges: [edge('located', 'unknown')]
  })
  assert.equal(result.health.directedDeclared, true)
  assert.equal(result.health.droppedEndpointEdges, 1)
  assert.equal(result.health.missingSourceLocationSymbols, 1)
  assert.equal(result.health.sourceLocationCoverage, 0.5)
  assert.equal(result.health.communityCoverage, 0.5)
})
